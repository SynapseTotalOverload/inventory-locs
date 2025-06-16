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
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processProgress, setProcessProgress] = useState(0);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const simulateProgress = (setFn: React.Dispatch<React.SetStateAction<number>>, stopAt: number = 95) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 5;
      if (progress >= stopAt) {
        clearInterval(interval);
        return;
      }
      setFn(Math.min(progress, stopAt));
    }, 100);
    return () => {
      clearInterval(interval);
      setFn(100);
    };
  };

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
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const stopUploadProgress = simulateProgress(setUploadProgress);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      stopUploadProgress();

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
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProcessing(true);
    setUploadProgress(0);
    setProcessProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const stopUploadProgress = simulateProgress(setUploadProgress);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      stopUploadProgress();

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const stopProcessingProgress = simulateProgress(setProcessProgress);

      const data = await response.json();
      stopProcessingProgress();

      toast({
        title: "Upload successful",
        description: `Processed ${data.stats.validRecords} records successfully. ${data.stats.invalidRecords} had errors.`,
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
      setTimeout(() => {
        setUploading(false);
        setProcessing(false);
        setUploadProgress(0);
        setProcessProgress(0);
      }, 1000);
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
    processing,
    uploadProgress,
    processProgress,
    preview,
    validationResults,
    fileInputRef,
    handleFileSelect,
    handleUpload,
    clearFile,
  };
}
