import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionOnServer } from "~/lib/auth-server";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const session = await getSessionOnServer();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
  component: () => <Outlet />,
});
