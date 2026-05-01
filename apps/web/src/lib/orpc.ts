import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { R_root } from "@repo/backend/router";

const link = new RPCLink({
  url: "/rpc",
  headers: () => ({
    "Content-Type": "application/json",
  }),
  fetch: (request, init) =>
    fetch(request, { ...init, credentials: "include" }),
});

const client = createORPCClient<typeof R_root>(link);

export const orpc = createTanstackQueryUtils(client);
