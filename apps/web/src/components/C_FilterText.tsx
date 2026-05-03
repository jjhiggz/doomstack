import { useEffect, useState } from "react";
import { Input } from "~/components/ui/input";

interface FilterTextProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

export function C_FilterText({ value, onChange, placeholder = "Search..." }: FilterTextProps) {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = local.trim();
      onChange(trimmed.length > 0 ? trimmed : undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, onChange]);

  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      className="h-8 w-40"
    />
  );
}
