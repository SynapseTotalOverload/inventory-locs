"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal, AlertTriangle, CheckCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { InventoryItem } from "@/types/inventory"

export const inventoryColumns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "location.name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.original.location?.name || "Unknown"}</div>
    },
  },
  {
    accessorKey: "product.name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <div>
          <div className="font-medium">{row.original.product?.name || "Unknown"}</div>
          <div className="text-sm text-muted-foreground">{row.original.product?.sku}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Quantity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const quantity = row.getValue("quantity") as number
      const minStock = row.original.min_stock_level
      const maxStock = row.original.max_stock_level

      let status: "low" | "normal" | "high" = "normal"
      if (quantity <= minStock) status = "low"
      else if (quantity >= maxStock) status = "high"

      return (
        <div className="flex items-center space-x-2">
          <span className="font-medium">{quantity}</span>
          {status === "low" && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Low
            </Badge>
          )}
          {status === "high" && (
            <Badge variant="secondary" className="text-xs">
              High
            </Badge>
          )}
          {status === "normal" && (
            <Badge variant="default" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              OK
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "min_stock_level",
    header: "Min Stock",
    cell: ({ row }) => {
      return <div className="text-center">{row.getValue("min_stock_level")}</div>
    },
  },
  {
    accessorKey: "max_stock_level",
    header: "Max Stock",
    cell: ({ row }) => {
      return <div className="text-center">{row.getValue("max_stock_level")}</div>
    },
  },
  {
    accessorKey: "last_updated",
    header: "Last Updated",
    cell: ({ row }) => {
      const date = new Date(row.getValue("last_updated"))
      return <div className="text-sm">{date.toLocaleDateString()}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const inventory = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(inventory.id)}>
              Copy inventory ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit inventory</DropdownMenuItem>
            <DropdownMenuItem>View details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
