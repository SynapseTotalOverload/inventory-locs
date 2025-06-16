"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { CSVUpload } from "@/types/inventory";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const uploadColumns: ColumnDef<CSVUpload>[] = [
  {
    accessorKey: "filename",
    header: "Filename",
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("filename")}</div>;
    },
  },
  {
    accessorKey: "vendor",
    header: "Vendor",
    cell: ({ row }) => {
      const vendor = row.getValue("vendor") as string;
      return (
        <Badge className={cn("text-nowrap", vendor === "vendor_a" ? "bg-[#95dd62]" : "bg-[#2596be]")}>
          {vendor === "vendor_a" ? "Vendor A" : "Vendor B"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant =
        status === "completed"
          ? "default"
          : status === "failed"
          ? "destructive"
          : status === "processing"
          ? "secondary"
          : "outline";

      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "records_processed",
    header: "Records",
    cell: ({ row }) => {
      const processed = row.getValue("records_processed") as number;
      const errors = row.original.errors_count;
      return (
        <div className="text-center">
          <div className="font-medium">{processed}</div>
          {errors && errors > 0 && <div className="text-xs text-red-600">{errors} errors</div>}
        </div>
      );
    },
  },
  {
    accessorKey: "upload_date",
    header: "Upload Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("upload_date"));
      return <div className="text-sm">{date.toLocaleString()}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const upload = row.original;

      return (
        <div className="flex items-center space-x-2">
          {upload.error_log && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Errors</DialogTitle>
                  <DialogDescription>Errors encountered during processing of {upload.filename}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96">
                  <pre className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded">
                    {JSON.stringify(JSON.parse(upload.error_log), null, 2)}
                  </pre>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>
      );
    },
  },
];

interface CSVUploadHistoryProps {
  refreshTrigger?: number;
}

export function CSVUploadHistory({ refreshTrigger }: CSVUploadHistoryProps) {
  const [uploads, setUploads] = useState<CSVUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase.from("csv_uploads").select("*").order("upload_date", { ascending: false });

      if (error) throw error;

      setUploads(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch upload history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    fetchUploads();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>Track your CSV upload processing history</CardDescription>
          </div>
          <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={uploadColumns} data={uploads} searchKey="filename" searchPlaceholder="Search uploads..." />
      </CardContent>
    </Card>
  );
}
