import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterClient } from "@orpc/server";
import type { R_root } from "@repo/backend/router";

const rpcUrl =
  typeof window !== "undefined" ? `${window.location.origin}/rpc` : "http://localhost:3001/rpc";

const link = new RPCLink({
  url: rpcUrl,
  fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
});

const client = createORPCClient<RouterClient<typeof R_root>>(link);

export const orpc = createTanstackQueryUtils(client);
