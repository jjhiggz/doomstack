import { createAuthClient } from "better-auth/client";

const baseURL =
  typeof window !== "undefined"
    ? "/api/auth"
    : "http://localhost:3001/api/auth";

export const authClient = createAuthClient({
  baseURL,
});
