import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: C_Index,
});

function C_Index() {
  return (
    <div>
      <h1>Effect-oRPC Demo</h1>
      <p>
        <a href="/login">Login</a> | <a href="/signup">Sign Up</a>
      </p>
    </div>
  );
}
