import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface FilterSelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: readonly string[];
  placeholder?: string;
  labels?: Record<string, string>;
}

export function C_FilterSelect({
  value,
  onChange,
  options,
  placeholder = "All",
  labels,
}: FilterSelectProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v == null || v === "all" ? undefined : v)}
    >
      <SelectTrigger className="h-8 w-32">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {labels?.[opt] ?? opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
