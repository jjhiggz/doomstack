import { os, ORPCError } from "@orpc/server";
import { auth } from "./auth.config";

export const os_withHeaders = os.$context<{ headers: Headers }>();

export const MW_authed = os_withHeaders.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({
    headers: context.headers,
  });

  if (!session) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "You must be logged in",
    });
  }

  return next({
    context: {
      ...context,
      session,
    },
  });
});
