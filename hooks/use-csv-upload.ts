import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { CSVService, type CSVPreview, type ValidationResults } from "@/services/csv-service";

interface UseCSVUploadProps {
  onUploadComplete?: () => void;
}

export function useCSVUpload({ onUploadComplete }: UseCSVUploadProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const csvService = new CSVService();

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

    try {
      const { preview, validationResults } = await csvService.processFile(selectedFile);
      setPreview(preview);
      setValidationResults(validationResults);
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
    if (!file || !preview) return;

    setUploading(true);
    setProgress(0);

    try {
      await csvService.uploadFile(file, setProgress);

      toast({
        title: "Upload successful",
        description: `Processed ${validationResults?.valid || 0} records successfully. ${
          validationResults?.invalid.length || 0
        } records had errors.`,
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
