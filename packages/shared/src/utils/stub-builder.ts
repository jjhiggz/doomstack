import type { z } from "zod";

/**
 * Schema-driven stub generation for type-safe, predictable test data.
 *
 * Creates objects guaranteed to be valid against Zod schemas with
 * index-based generation for reproducible tests.
 *
 * @example
 * ```ts
 * const STTodo = makeStub(SRow_Todo, {
 *   generators: {
 *     id: ({ index = 0 }) => `todo-${index + 1}`,
 *     title: ({ index = 0 }) => `Todo ${index + 1}`,
 *   },
 * });
 *
 * STTodo.one()                          // single stub with defaults
 * STTodo.one({ title: "Custom" })       // override specific fields
 * STTodo.many(5)                        // 5 stubs with index-based variation
 * STTodo.many(3, (i) => ({ title: `Item ${i}` }))  // per-item overrides
 * ```
 */

/* =========================
 * Array DSL
 * ========================= */
const ARRAY = Symbol("ARRAY_SPEC");
type ArraySpec<T> = { [ARRAY]: true; apply(base: T[], ctx: Ctx): T[] };

/** Combine multiple array operations in order. */
function compose<T>(...specs: ArraySpec<T>[]): ArraySpec<T> {
  return {
    [ARRAY]: true as const,
    apply(base, ctx) {
      return specs.reduce((acc, s) => s.apply(acc, ctx), base);
    },
  };
}

/** Create an array with exactly n items using the builder function. */
export function times<T>(n: number, builder: (ctx: Ctx & { i: number }) => T): ArraySpec<T> {
  return {
    [ARRAY]: true as const,
    apply(_base, ctx) {
      const out: T[] = [];
      for (let i = 0; i < n; i++) out.push(builder({ ...ctx, i }));
      return out;
    },
  };
}

/** Transform each item in an existing array. */
export function each<T>(mapper: (ctx: Ctx & { i: number; current?: T }) => T): ArraySpec<T> {
  return {
    [ARRAY]: true as const,
    apply(base, ctx) {
      return base.map((v, i) => mapper({ ...ctx, i, current: v }));
    },
  };
}

/** Set the value at a specific array index. */
export function at<T>(
  index: number,
  value: T | ((ctx: Ctx & { i: number; current?: T }) => T),
): ArraySpec<T> {
  return {
    [ARRAY]: true as const,
    apply(base, ctx) {
      const copy = base.slice();
      while (copy.length <= index) copy.push(undefined as T);

      const cur = copy[index];
      const callValue = (fn: (ctx: Ctx & { i: number; current?: T }) => T) =>
        fn({ ...ctx, i: index, current: cur });
      copy[index] =
        typeof value === "function"
          ? callValue(value as (ctx: Ctx & { i: number; current?: T }) => T)
          : value;
      return copy;
    },
  };
}

/** Append one or more items to the end of an array. */
export function append<T>(...values: (T | ((ctx: Ctx & { i: number }) => T))[]): ArraySpec<T> {
  return {
    [ARRAY]: true as const,
    apply(base, ctx) {
      const extra = values.map((v, i) =>
        typeof v === "function" ? (v as (ctx: Ctx & { i: number }) => T)({ ...ctx, i }) : v,
      );
      return base.concat(extra);
    },
  };
}

/* =========================
 * Types
 * ========================= */
// biome-ignore lint: using any for Zod schema compatibility
type ZodSchema = z.ZodType<any, any>;
type Infer<Z extends ZodSchema> = z.infer<Z>;

type Overrides<T> = T extends (infer U)[]
  ? Array<Overrides<U>> | ArraySpec<U>
  : T extends object
    ? { [K in keyof T]?: Overrides<T[K]> | Generator<T[K]> }
    : T;

type Ctx = {
  path: string;
  pick: <U>(...values: U[]) => U;
  ref?: (path: string) => unknown | undefined;
  index?: number;
};

type Generator<T> = (ctx: Ctx) => T;
type FieldGenerators<T> = Partial<{ [K in keyof T]: Generator<T[K]> }>;

export type StubConfig<Z extends ZodSchema> = {
  generators?: FieldGenerators<Infer<Z>>;
  defaults?: {
    arrays?: Partial<Record<keyof Infer<Z>, number>>;
  };
};

export type StubBuilder<Z extends ZodSchema> = {
  one(overrides?: Overrides<Infer<Z>>): Infer<Z>;
  many(
    n: number,
    overrides?: Overrides<Infer<Z>> | ((index: number) => Overrides<Infer<Z>>),
  ): Infer<Z>[];
};

/* =========================
 * Zod 4 internals
 *
 * _def.type: "object" | "string" | "number" | "boolean" | "date" | "array" |
 *            "enum" | "optional" | "nullable" | "default" | "literal" | ...
 * _def.shape: getter (object schemas)
 * _def.element: inner schema (array schemas)
 * _def.innerType: wrapped schema (optional/nullable/default)
 * _def.entries: enum values as record
 * ========================= */

function getType(s: any): string {
  return s._def?.type ?? "";
}

/* =========================
 * Builder
 * ========================= */
export function makeStub<Z extends ZodSchema>(
  schema: Z,
  config: StubConfig<Z> = {},
): StubBuilder<Z> {
  const pick = <T>(...values: T[]) => values[Math.floor(Math.random() * values.length)];

  const ctxBase: Ctx = {
    path: "",
    pick,
    ref: () => undefined,
    index: 0,
  };

  function buildFromSchema(
    s: any,
    path: string,
    overrides: any,
    _parentObjRef?: Record<string, unknown>,
    arrayIndex?: number,
  ): any {
    let isNullable = false;
    let isOptional = false;

    // Handle default
    let hasDefault = false;
    let defaultValue: any;
    if (getType(s) === "default") {
      hasDefault = true;
      defaultValue =
        typeof s._def?.defaultValue === "function" ? s._def.defaultValue() : s._def?.defaultValue;
      s = s._def.innerType;
    }

    // Unwrap optional/nullable
    while (true) {
      const t = getType(s);
      if (t === "optional") {
        isOptional = true;
        s = s._def.innerType;
      } else if (t === "nullable") {
        isNullable = true;
        s = s._def.innerType;
      } else {
        break;
      }
    }

    const type = getType(s);

    // Array
    if (type === "array") {
      const el = s._def.element;
      const fieldName = path.split(".").pop() ?? "";
      const defaultLen = resolveDefaultArrayLength(fieldName);
      const base = Array.from({ length: defaultLen }, (_, i) =>
        buildFromSchema(el, `${path}[${i}]`, undefined, _parentObjRef, i),
      );

      if (isArraySpec(overrides)) return overrides.apply(base, { ...ctxBase, path });
      if (Array.isArray(overrides)) {
        if (isPrimitive(el)) return overrides;
        return overrides.map((v, i) => {
          if (v !== undefined && typeof v === "object" && !isArraySpec(v)) {
            const defaultItem = buildFromSchema(el, `${path}[${i}]`, undefined, _parentObjRef, i);
            return { ...defaultItem, ...v };
          }
          return v !== undefined
            ? v
            : buildFromSchema(el, `${path}[${i}]`, undefined, _parentObjRef, i);
        });
      }
      return base;
    }

    // Object
    if (type === "object") {
      const shape = s._def.shape;
      if (!shape || typeof shape !== "object") return {};
      const out: Record<string, any> = {};
      const localRef = (p: string) => getByPath(out, p);

      for (const key of Object.keys(shape)) {
        const childSchema = shape[key];
        const childPath = path ? `${path}.${key}` : key;

        const fieldGen = config.generators?.[key as keyof Infer<Z>] as Generator<any> | undefined;
        const ov = overrides?.[key];

        if (ov !== undefined) {
          if (typeof ov === "function") {
            out[key] = ov({ ...ctxBase, path: childPath, ref: localRef, index: arrayIndex });
            continue;
          }
          if (isPrimitive(childSchema)) {
            out[key] = ov;
          } else {
            out[key] = buildFromSchema(childSchema, childPath, ov, out, arrayIndex);
          }
          continue;
        }

        if (fieldGen) {
          out[key] = fieldGen({ ...ctxBase, path: childPath, ref: localRef, index: arrayIndex });
          continue;
        }

        const val = buildFromSchema(childSchema, childPath, undefined, out, arrayIndex);
        if (val !== undefined) out[key] = val;
      }
      return out;
    }

    // Primitives
    if (hasDefault) return defaultValue;
    if (isNullable) return null;
    if (isOptional) return undefined;

    switch (type) {
      case "string":
        return "";
      case "number":
        return 0;
      case "bigint":
        return BigInt(0);
      case "boolean":
        return false;
      case "date":
        return new Date(0);
      case "enum":
        return Object.values(s._def.entries)[0];
      case "nativeEnum":
        return Object.values(s._def.values)[0];
      case "literal":
        return s._def.values?.[0] ?? s._def.value;
      case "any":
        return {};
      default:
        return null;
    }
  }

  function getByPath(obj: any, path: string): any {
    if (!path) return obj;
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in cur) {
        cur = cur[p];
      } else {
        return undefined;
      }
    }
    return cur;
  }

  function isArraySpec<T>(v: unknown): v is ArraySpec<T> {
    return !!v && typeof v === "object" && ARRAY in v && (v as ArraySpec<T>)[ARRAY] === true;
  }

  function isPrimitive(schema: any): boolean {
    let s = schema;
    while (true) {
      const t = getType(s);
      if (t === "optional" || t === "nullable") {
        s = s._def.innerType;
      } else {
        break;
      }
    }
    return [
      "string",
      "number",
      "boolean",
      "date",
      "enum",
      "nativeEnum",
      "bigint",
      "literal",
    ].includes(getType(s));
  }

  function resolveDefaultArrayLength(fieldName: string): number {
    const len = config.defaults?.arrays?.[fieldName as keyof Infer<Z>];
    return typeof len === "number" ? len : 1;
  }

  return {
    one(overrides?: Overrides<Infer<Z>>): Infer<Z> {
      return buildFromSchema(schema, "", overrides) as Infer<Z>;
    },
    many(
      n: number,
      overrides?: Overrides<Infer<Z>> | ((index: number) => Overrides<Infer<Z>>),
    ): Infer<Z>[] {
      return Array.from({ length: n }, (_, i) => {
        const itemOverrides =
          typeof overrides === "function"
            ? (overrides as (index: number) => Overrides<Infer<Z>>)(i)
            : overrides;
        return buildFromSchema(schema, "", itemOverrides, undefined, i);
      });
    },
  };
}

export { compose };
