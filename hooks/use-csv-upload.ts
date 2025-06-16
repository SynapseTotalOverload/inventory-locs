import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseCSVUploadProps {
  onUploadComplete?: () => void;
}

interface PreviewData {
  vendor: string;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
}

interface ValidationResults {
  valid: number;
  invalid: Array<{
    row: number;
    errors: string[];
  }>;
}

interface UploadResponse {
  success: boolean;
  uploadId: string;
  stats: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  };
  preview: PreviewData;
}

export function useCSVUpload({ onUploadComplete }: UseCSVUploadProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Create preview using the API
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process file");
      }

      const data = (await response.json()) as UploadResponse;
      setPreview(data.preview);
      setValidationResults({
        valid: data.stats.validRecords,
        invalid: Array(data.stats.invalidRecords).fill({ row: 0, errors: ["Validation failed"] }),
      });
    } catch (error) {
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      clearFile();
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = (await response.json()) as UploadResponse;
      setProgress(100);

      toast({
        title: "Upload successful",
        description: `Processed ${data.stats.validRecords} records successfully. ${data.stats.invalidRecords} records had errors.`,
      });

      clearFile();
      onUploadComplete?.();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setValidationResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return {
    file,
    uploading,
    progress,
    preview,
    validationResults,
    fileInputRef,
    handleFileSelect,
    handleUpload,
    clearFile,
  };
}
