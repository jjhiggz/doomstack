import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { authClient } from "./auth-client";

export const getSessionOnServer = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const cookie = headers.get("cookie") ?? "";

    const session = await authClient.getSession({
      fetchOptions: {
        headers: { cookie },
      },
    });

    return session.data;
  },
);
