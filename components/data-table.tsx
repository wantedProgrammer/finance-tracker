"use client"

import * as React from "react"
import { useConfirm } from "@/hooks/use-confirm"
import { cn } from "@/lib/utils"

import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  RowSelectionState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash } from "lucide-react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterKey: string
  onDelete: (rows: Row<TData>[]) => void;
  disabled?: boolean;
  label?: string;
  // Column ids to hide on phones, so the table fits without scrolling sideways.
  hiddenOnMobile?: string[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterKey,
  onDelete,
  disabled,
  label = "item",
  hiddenOnMobile = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Hidden with CSS below Tailwind's "sm" breakpoint (640px), so phones get the narrow table
  // from the first frame, without waiting for JavaScript or the layout jumping.
  const mobileHidden = (columnId: string) => (hiddenOnMobile.includes(columnId) ? "hidden sm:table-cell" : undefined)


  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    selectedCount > 1
      ? "You are about to perform a bulk delete? This action cannot be undone."
      : `You are about to delete this ${label}. This action cannot be undone.`
  );

  return (
    <div>
      <ConfirmDialog />
      <div className="flex items-center pb-4">
        <Input
          placeholder={`Filter ${filterKey}...`}
          value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(filterKey)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <Button
            disabled={disabled}
            variant="outline"
            size="sm"
            className="ml-auto font-normal text-xs"
            onClick={async () => {
              const ok = await confirm();

              if (ok) {
                onDelete(table.getFilteredSelectedRowModel().rows)
                table.resetRowSelection();
              }
              
            }}
          >
            <Trash className="size-4" />
              Delete({table.getFilteredSelectedRowModel().rows.length})
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={cn("[&_[data-slot=button]]:px-2 sm:[&_[data-slot=button]]:px-3", mobileHidden(header.column.id))}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={mobileHidden(cell.column.id)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        {/* Selection is a bulk-delete tool; on phones (where checkboxes can be hidden) it's noise. */}
        <div className="hidden sm:block flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {""}
          {table.getFilteredRowModel().rows.length} rows(s) selected.

        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
