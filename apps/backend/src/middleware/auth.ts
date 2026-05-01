import { os, ORPCError } from "@orpc/server";
import { auth } from "../auth";

export const MW_authed = os.middleware(async ({ context, next }) => {
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
