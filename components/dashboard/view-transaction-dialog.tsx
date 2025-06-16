"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SalesTransaction } from "@/types/inventory";

interface ViewTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: SalesTransaction | null;
}

export function ViewTransactionDialog({ open, onOpenChange, transaction }: ViewTransactionDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-medium">Date</div>
            <div className="col-span-3">{new Date(transaction.transaction_date).toLocaleDateString()}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-medium">Location</div>
            <div className="col-span-3">{transaction.location_code}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-medium">Product</div>
            <div className="col-span-3">
              <div>{transaction.product_name}</div>
              {transaction.upc_code && <div className="text-sm text-muted-foreground">UPC: {transaction.upc_code}</div>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-medium">Unit Price</div>
            <div className="col-span-3">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(transaction.unit_price)}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-medium">Quantity</div>
            <div className="col-span-3">{transaction.quantity}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-medium">Total</div>
            <div className="col-span-3">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(transaction.final_amount)}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-medium">Vendor</div>
            <div className="col-span-3">
              <Badge className={cn("text-nowrap", transaction.vendor === "vendor_a" ? "bg-[#95dd62]" : "bg-[#2596be]")}>
                {transaction.vendor === "vendor_a" ? "Vendor A" : "Vendor B"}
              </Badge>
            </div>
          </div>
          {transaction.id && (
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="font-medium">Transaction ID</div>
              <div className="col-span-3 font-mono text-sm">{transaction.id}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
