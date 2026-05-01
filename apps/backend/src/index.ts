import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { R_root } from "./router";
import { auth } from "./auth";

const app = new Hono();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// better-auth handler
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// oRPC handler
const rpcHandler = new RPCHandler(R_root, {
  interceptors: [
    onError((error) => {
      console.error("[oRPC Error]", error);
    }),
  ],
});

app.all("/rpc/*", async (c) => {
  const result = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: { headers: c.req.raw.headers },
  });

  if (result.matched) return result.response;
  return c.text("Not found", 404);
});

const port = 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
