"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddItemDialog({ open, onOpenChange, onSuccess }: AddItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "",
    unit_price: "",
    quantity: "1",
    location_code: "",
    vendor: "vendor_a",
    category: "standard",
    custom_category: "",
  });
  const { toast } = useToast();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("sales_transactions").insert([
        {
          product_name: formData.product_name,
          unit_price: parseFloat(formData.unit_price),
          quantity: parseInt(formData.quantity),
          location_code: formData.location_code,
          vendor: formData.vendor,
          category: formData.category === "custom" ? formData.custom_category : formData.category,
          transaction_date: new Date().toISOString(),
          final_amount: parseFloat(formData.unit_price) * parseInt(formData.quantity),
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added successfully",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Sales Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product_name">Product Name</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={e => setFormData({ ...formData, product_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_price">Unit Price</Label>
            <Input
              id="unit_price"
              type="number"
              step="0.01"
              value={formData.unit_price}
              onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location_code">Location Code</Label>
            <Input
              id="location_code"
              value={formData.location_code}
              onChange={e => setFormData({ ...formData, location_code: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Select value={formData.vendor} onValueChange={value => setFormData({ ...formData, vendor: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendor_a">Vendor A</SelectItem>
                <SelectItem value="vendor_b">Vendor B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={value => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.category === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom_category">Custom Category Name</Label>
              <Input
                id="custom_category"
                value={formData.custom_category}
                onChange={e => setFormData({ ...formData, custom_category: e.target.value })}
                required
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
