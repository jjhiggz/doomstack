import type { IRow_Todo } from "@repo/shared/todos";
import type { Row_Todo } from "../tables/todos.table";
import type { AssertEqual } from "../utils/type-testing";

const _check: AssertEqual<IRow_Todo, Row_Todo> = true;
