import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/")({
  component: C_Index,
});

function C_Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Effect-oRPC Demo</h1>
        <p className="mt-2 text-muted-foreground">End-to-end type safety with classified errors</p>
      </div>
      <div className="flex gap-3">
        <Link to="/login" className={cn(buttonVariants({ variant: "default", size: "lg" }))}>
          Login
        </Link>
        <Link to="/signup" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          Sign Up
        </Link>
      </div>
    </div>
  );
}
