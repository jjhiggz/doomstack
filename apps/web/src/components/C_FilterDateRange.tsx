import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface FilterDateRangeProps {
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onDateFromChange: (value: string | undefined) => void;
  onDateToChange: (value: string | undefined) => void;
}

export function C_FilterDateRange({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: FilterDateRangeProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">From</Label>
      <Input
        type="date"
        value={dateFrom ?? ""}
        onChange={(e) => onDateFromChange(e.target.value || undefined)}
        className="h-8 w-36"
      />
      <Label className="text-xs text-muted-foreground">To</Label>
      <Input
        type="date"
        value={dateTo ?? ""}
        onChange={(e) => onDateToChange(e.target.value || undefined)}
        className="h-8 w-36"
      />
    </div>
  );
}
