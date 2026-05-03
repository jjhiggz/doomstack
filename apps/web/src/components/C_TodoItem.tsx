import type { IRow_Todo } from "@repo/shared/todos";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { useToggleTodo, useDeleteTodo } from "~/lib/queries/todos";

export function C_TodoItem({ todo }: { todo: IRow_Todo }) {
  const toggleMutation = useToggleTodo();
  const deleteMutation = useDeleteTodo();

  return (
    <div className="group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50">
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => toggleMutation.mutate({ id: todo.id })}
        disabled={toggleMutation.isPending}
      />
      <span
        className={cn("flex-1 text-sm", todo.completed && "text-muted-foreground line-through")}
      >
        {todo.title}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => deleteMutation.mutate({ id: todo.id })}
        disabled={deleteMutation.isPending}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
