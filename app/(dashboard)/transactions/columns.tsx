"use client"

import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { InferResponseType } from "hono"
import { Actions } from "./actions"
import { format } from "date-fns"
import { cn, formatCurrency } from "@/lib/utils"
import { formatPayee } from "@/lib/categorize"
import { client } from "@/lib/hono"
import { AccountColumn } from "./account-column"
import { CategoryColumn } from "./category-column"

export type ResponseType = InferResponseType<typeof client.api.transactions.$get, 200>["data"][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("date") as Date;

      // Short date on phones ("04 Nov") so the table fits; the full date from sm up.
      return (
        <span className="whitespace-nowrap">
          <span className="sm:hidden">{format(date, "dd MMM")}</span>
          <span className="hidden sm:inline">{format(date, "dd MMMM, yyyy")}</span>
        </span>
      )
    }
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <CategoryColumn
          id={row.original.id}
          category={row.original.category}
          categoryId={row.original.categoryId}
        />
      )
    }
  },
  {
    accessorKey: "payee",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Payee
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const payee = row.original.payee;

      // Readable name in the table; hover shows the original bank text.
      return (
        <div className="min-w-0">
          <span title={payee} className="block max-w-[7rem] min-[360px]:max-w-[8.5rem] truncate sm:max-w-none sm:whitespace-normal">
            {formatPayee(payee)}
          </span>
          {/* Phones hide the date column, so the date sits under the payee. */}
          <span className="block text-xs text-muted-foreground sm:hidden">
            {format(new Date(row.original.date), "dd MMM yyyy")}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));

      // Plain, aligned figures: money in is green with a "+", spending stays neutral
      // so the list doesn't turn into a wall of red.
      return (
        <span
          className={cn(
            "font-medium tabular-nums whitespace-nowrap",
            amount > 0 && "text-income-strong",
          )}
        >
          {amount > 0 && "+"}
          {formatCurrency(amount)}
        </span>
      )
    }
  },
  {
    accessorKey: "account",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Account
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <AccountColumn
          id={row.original.id}
          account={row.original.accounts}
          accountId={row.original.accountId}
        />
      )
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <Actions id={row.original.id} />
  }
]
