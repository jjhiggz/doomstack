import { describe, it, expect } from "vitest";
import { z } from "zod";
import { makeStub, times, each, at, append, compose } from "./stub-builder";
import { SRow_Todo } from "../todos.schema";

// ── Test schemas ──

const S_Simple = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  active: z.boolean(),
});

const S_WithDate = z.object({
  id: z.string(),
  createdAt: z.date(),
  coerced: z.coerce.date(),
});

const S_WithOptional = z.object({
  required: z.string(),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  withDefault: z.string().default("hello"),
});

const S_WithEnum = z.object({
  status: z.enum(["active", "inactive", "pending"]),
});

const S_WithArray = z.object({
  tags: z.array(z.string()),
});

const S_WithObjectArray = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      label: z.string(),
    }),
  ),
});

const S_Nested = z.object({
  user: z.object({
    name: z.string(),
    address: z.object({
      city: z.string(),
    }),
  }),
});

const S_WithLiteral = z.object({
  type: z.literal("todo"),
  id: z.string(),
});

// ── Primitive defaults ──

describe("primitive defaults", () => {
  const ST = makeStub(S_Simple);

  it("generates empty strings for string fields", () => {
    expect(ST.one().id).toBe("");
    expect(ST.one().name).toBe("");
  });

  it("generates 0 for number fields", () => {
    expect(ST.one().age).toBe(0);
  });

  it("generates false for boolean fields", () => {
    expect(ST.one().active).toBe(false);
  });
});

describe("date defaults", () => {
  const ST = makeStub(S_WithDate);

  it("generates epoch date for date fields", () => {
    const stub = ST.one();
    expect(stub.createdAt).toEqual(new Date(0));
  });

  it("handles z.coerce.date()", () => {
    const stub = ST.one();
    expect(stub.coerced).toEqual(new Date(0));
  });
});

describe("enum defaults", () => {
  const ST = makeStub(S_WithEnum);

  it("picks the first enum value", () => {
    expect(ST.one().status).toBe("active");
  });
});

describe("literal defaults", () => {
  const ST = makeStub(S_WithLiteral);

  it("returns the literal value", () => {
    expect(ST.one().type).toBe("todo");
  });
});

// ── Optional / Nullable / Default ──

describe("optional, nullable, default", () => {
  const ST = makeStub(S_WithOptional);

  it("includes required fields", () => {
    expect(ST.one().required).toBe("");
  });

  it("omits optional fields", () => {
    const stub = ST.one();
    expect(stub.optional).toBeUndefined();
    expect("optional" in stub).toBe(false);
  });

  it("sets nullable fields to null", () => {
    expect(ST.one().nullable).toBeNull();
  });

  it("uses default values", () => {
    expect(ST.one().withDefault).toBe("hello");
  });

  it("allows overriding optional fields", () => {
    expect(ST.one({ optional: "set" }).optional).toBe("set");
  });

  it("allows overriding nullable fields", () => {
    expect(ST.one({ nullable: "set" }).nullable).toBe("set");
  });
});

// ── Generators ──

describe("generators", () => {
  const ST = makeStub(S_Simple, {
    generators: {
      id: ({ index = 0 }) => `user-${index + 1}`,
      name: ({ index = 0 }) => `User ${index + 1}`,
      age: ({ index = 0 }) => 20 + index,
      active: () => true,
    },
  });

  it("uses generators for field values", () => {
    const stub = ST.one();
    expect(stub.id).toBe("user-1");
    expect(stub.name).toBe("User 1");
    expect(stub.age).toBe(20);
    expect(stub.active).toBe(true);
  });

  it("overrides take precedence over generators", () => {
    const stub = ST.one({ name: "Custom" });
    expect(stub.name).toBe("Custom");
    expect(stub.id).toBe("user-1"); // generator still used for non-overridden
  });

  it("passes index to generators in many()", () => {
    const stubs = ST.many(3);
    expect(stubs[0].id).toBe("user-1");
    expect(stubs[1].id).toBe("user-2");
    expect(stubs[2].id).toBe("user-3");
    expect(stubs[0].age).toBe(20);
    expect(stubs[1].age).toBe(21);
    expect(stubs[2].age).toBe(22);
  });
});

// ── one() overrides ──

describe("one() overrides", () => {
  const ST = makeStub(S_Simple);

  it("applies partial overrides", () => {
    const stub = ST.one({ name: "Alice", age: 30 });
    expect(stub.name).toBe("Alice");
    expect(stub.age).toBe(30);
    expect(stub.id).toBe(""); // default
    expect(stub.active).toBe(false); // default
  });

  it("allows generator functions as overrides", () => {
    const stub = ST.one({
      name: ({ index = 0 }) => `Override ${index}`,
    });
    expect(stub.name).toBe("Override 0");
  });
});

// ── many() ──

describe("many()", () => {
  const ST = makeStub(S_Simple, {
    generators: {
      id: ({ index = 0 }) => `id-${index}`,
    },
  });

  it("generates n stubs", () => {
    const stubs = ST.many(5);
    expect(stubs).toHaveLength(5);
  });

  it("applies static overrides to all items", () => {
    const stubs = ST.many(3, { active: true });
    expect(stubs.every((s) => s.active === true)).toBe(true);
  });

  it("accepts a per-item override function", () => {
    const stubs = ST.many(3, (i) => ({ name: `Item ${i}` }));
    expect(stubs[0].name).toBe("Item 0");
    expect(stubs[1].name).toBe("Item 1");
    expect(stubs[2].name).toBe("Item 2");
  });
});

// ── Nested objects ──

describe("nested objects", () => {
  const ST = makeStub(S_Nested);

  it("generates nested defaults", () => {
    const stub = ST.one();
    expect(stub.user.name).toBe("");
    expect(stub.user.address.city).toBe("");
  });

  it("allows partial nested overrides", () => {
    const stub = ST.one({ user: { name: "Alice" } });
    expect(stub.user.name).toBe("Alice");
    expect(stub.user.address.city).toBe(""); // still filled
  });

  it("allows deep nested overrides", () => {
    const stub = ST.one({ user: { address: { city: "NYC" } } });
    expect(stub.user.address.city).toBe("NYC");
    expect(stub.user.name).toBe(""); // still filled
  });
});

// ── Arrays ──

describe("arrays", () => {
  describe("default behavior", () => {
    const ST = makeStub(S_WithArray);

    it("generates 1-element arrays by default", () => {
      expect(ST.one().tags).toHaveLength(1);
      expect(ST.one().tags[0]).toBe("");
    });
  });

  describe("custom default length", () => {
    const ST = makeStub(S_WithArray, {
      defaults: { arrays: { tags: 3 } },
    });

    it("respects configured default length", () => {
      expect(ST.one().tags).toHaveLength(3);
    });
  });

  describe("literal array override", () => {
    const ST = makeStub(S_WithArray);

    it("replaces array with literal values", () => {
      const stub = ST.one({ tags: ["a", "b", "c"] });
      expect(stub.tags).toEqual(["a", "b", "c"]);
    });
  });

  describe("object arrays", () => {
    const ST = makeStub(S_WithObjectArray, {
      defaults: { arrays: { items: 2 } },
    });

    it("generates default object array items", () => {
      const stub = ST.one();
      expect(stub.items).toHaveLength(2);
      expect(stub.items[0]).toEqual({ id: 0, label: "" });
    });

    it("merges partial overrides into object array items", () => {
      const stub = ST.one({ items: [{ label: "first" }] });
      expect(stub.items[0].label).toBe("first");
      expect(stub.items[0].id).toBe(0); // default filled
    });
  });
});

// ── Array DSL ──

describe("array DSL", () => {
  const ST = makeStub(S_WithArray, {
    defaults: { arrays: { tags: 3 } },
  });

  describe("times()", () => {
    it("creates n items from scratch", () => {
      const stub = ST.one({ tags: times(4, ({ i }) => `tag-${i}`) });
      expect(stub.tags).toEqual(["tag-0", "tag-1", "tag-2", "tag-3"]);
    });
  });

  describe("each()", () => {
    it("transforms existing items", () => {
      const stub = ST.one({
        tags: compose(
          times(2, ({ i }) => `tag-${i}`),
          each(({ current, i }) => `${current}-mapped-${i}`),
        ),
      });
      expect(stub.tags).toEqual(["tag-0-mapped-0", "tag-1-mapped-1"]);
    });
  });

  describe("at()", () => {
    it("sets a specific index", () => {
      const stub = ST.one({ tags: at(1, "special") });
      expect(stub.tags[1]).toBe("special");
      expect(stub.tags).toHaveLength(3);
    });

    it("accepts a function", () => {
      const stub = ST.one({
        tags: at(0, ({ current }) => `was:${current}`),
      });
      expect(stub.tags[0]).toBe("was:");
    });
  });

  describe("append()", () => {
    it("adds items to the end", () => {
      const stub = ST.one({ tags: append("x", "y") });
      expect(stub.tags).toHaveLength(5);
      expect(stub.tags.slice(-2)).toEqual(["x", "y"]);
    });
  });

  describe("compose()", () => {
    it("chains multiple operations", () => {
      const stub = ST.one({
        tags: compose(
          times(2, ({ i }) => `t-${i}`),
          at(0, "first"),
          append("last"),
        ),
      });
      expect(stub.tags).toEqual(["first", "t-1", "last"]);
    });
  });
});

// ── Real-world: SRow_Todo stub ──

describe("SRow_Todo stub (real schema)", () => {
  it("works with the project's actual todo schema", () => {
    const ST = makeStub(SRow_Todo, {
      generators: {
        id: ({ index = 0 }) => `todo-${index + 1}`,
        title: ({ index = 0 }) => `Todo ${index + 1}`,
        completed: () => false,
        userId: () => "user-1",
        createdAt: () => new Date("2025-01-01T00:00:00Z"),
        dueDate: () => null,
      },
    });

    const stub = ST.one();
    expect(stub.id).toBe("todo-1");
    expect(stub.title).toBe("Todo 1");
    expect(stub.completed).toBe(false);
    expect(stub.createdAt).toEqual(new Date("2025-01-01T00:00:00Z"));
  });

  it("generates many with index-based variation", () => {
    const ST = makeStub(SRow_Todo, {
      generators: {
        id: ({ index = 0 }) => `todo-${index + 1}`,
        title: ({ index = 0 }) => `Todo ${index + 1}`,
        completed: ({ index = 0 }) => index % 2 === 0,
        userId: () => "user-1",
        createdAt: () => new Date("2025-01-01T00:00:00Z"),
        dueDate: () => null,
      },
    });

    const stubs = ST.many(4);
    expect(stubs).toHaveLength(4);
    expect(stubs.map((s) => s.id)).toEqual(["todo-1", "todo-2", "todo-3", "todo-4"]);
    expect(stubs.map((s) => s.completed)).toEqual([true, false, true, false]);
  });

  it("allows overrides on real schema", () => {
    const ST = makeStub(SRow_Todo, {
      generators: {
        id: ({ index = 0 }) => `todo-${index + 1}`,
        title: ({ index = 0 }) => `Todo ${index + 1}`,
        completed: () => false,
        userId: () => "user-1",
        createdAt: () => new Date("2025-01-01T00:00:00Z"),
        dueDate: () => null,
      },
    });

    const stub = ST.one({ title: "Custom title", completed: true });
    expect(stub.title).toBe("Custom title");
    expect(stub.completed).toBe(true);
    expect(stub.id).toBe("todo-1"); // generator still used
  });
});
