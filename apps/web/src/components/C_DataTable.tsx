import { match } from "ts-pattern";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
}

type SortState = "asc" | "desc" | "inactive";

function SortIcon({ state }: { state: SortState }) {
  return match(state)
    .with("asc", () => <ArrowUp className="ml-1 size-3" />)
    .with("desc", () => <ArrowDown className="ml-1 size-3" />)
    .with("inactive", () => <ArrowUpDown className="ml-1 size-3 opacity-50" />)
    .exhaustive();
}

interface HeaderCellContentProps {
  headerContent: React.ReactNode;
  fieldId: string;
  canSort: boolean | undefined;
  isActive: boolean;
  sortOrder: "asc" | "desc" | undefined;
  onSort: ((field: string) => void) | undefined;
}

function HeaderCellContent({
  headerContent,
  fieldId,
  canSort,
  isActive,
  sortOrder,
  onSort,
}: HeaderCellContentProps) {
  if (!canSort || !onSort) return <>{headerContent}</>;

  const sortState: SortState = isActive ? (sortOrder ?? "asc") : "inactive";

  return (
    <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => onSort(fieldId)}>
      {headerContent}
      <SortIcon state={sortState} />
    </Button>
  );
}

function TableRows<TData>({
  table,
  columns,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  columns: ColumnDef<TData, unknown>[];
}) {
  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-24 text-center">
          No results.
        </TableCell>
      </TableRow>
    );
  }

  return rows.map((row) => (
    <TableRow key={row.id}>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function C_DataTable<TData>({
  columns,
  data,
  sortField,
  sortOrder,
  onSort,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.columnDef.meta?.sortable;
                const fieldId = header.column.id;
                const isActive = sortField === fieldId;
                const headerContent = header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext());

                return (
                  <TableHead key={header.id}>
                    <HeaderCellContent
                      headerContent={headerContent}
                      fieldId={fieldId}
                      canSort={canSort}
                      isActive={isActive}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          <TableRows table={table} columns={columns} />
        </TableBody>
      </Table>
    </div>
  );
}

// Extend TanStack Table's ColumnMeta to include sortable flag
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    sortable?: boolean;
  }
}
