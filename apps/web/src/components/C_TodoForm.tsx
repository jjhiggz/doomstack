import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Plus } from "lucide-react";
import { useCreateTodo } from "~/lib/queries/todos";

export function C_TodoForm() {
  const [title, setTitle] = useState("");
  const createMutation = useCreateTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({ title: title.trim() }, { onSuccess: () => setTitle("") });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={255}
        className="flex-1"
      />
      <Button type="submit" disabled={createMutation.isPending} size="default">
        <Plus className="size-4" />
        Add
      </Button>
    </form>
  );
}
