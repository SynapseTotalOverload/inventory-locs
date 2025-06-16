"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { useCSVUpload } from "@/hooks/use-csv-upload";

interface CSVUploadProps {
  onUploadComplete?: () => void;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const {
    file,
    uploading,
    progress,
    preview,
    validationResults,
    fileInputRef,
    handleFileSelect,
    handleUpload,
    clearFile,
  } = useCSVUpload({ onUploadComplete });

  return (
    <Card className="w-full ">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="mr-2 h-5 w-5" />
          CSV Upload
        </CardTitle>
        <CardDescription>Upload sales transaction data from Vendor A Vending or Vendor B Systems</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={uploading}
            />
            {file && (
              <Button variant="outline" size="sm" onClick={clearFile} disabled={uploading}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* File Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">File Preview</h3>
              <Badge variant={preview.vendor.includes("Unknown") ? "destructive" : "default"}>{preview.vendor}</Badge>
            </div>

            {preview.vendor.includes("Unknown") && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Unsupported Format</AlertTitle>
                <AlertDescription>
                  This CSV format is not recognized. Please ensure you're uploading a file from Vendor A Vending or
                  Vendor B Systems.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">Headers: {preview.headers.join(", ")}</div>
              <div className="text-sm text-muted-foreground mb-2">Total rows: {preview.totalRows}</div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {preview.headers.map((header, index) => (
                        <th key={index} className="text-left p-2 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="p-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validationResults && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Validation Results</h3>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-600">{validationResults.valid}</div>
                      <div className="text-sm text-muted-foreground">Valid records</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold text-red-600">{validationResults.invalid.length}</div>
                      <div className="text-sm text-muted-foreground">Invalid records</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {validationResults.invalid.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {validationResults.invalid.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm">
                        Row {error.row}: {error.errors.join(", ")}
                      </div>
                    ))}
                    {validationResults.invalid.length > 5 && (
                      <div className="text-sm font-medium">
                        ... and {validationResults.invalid.length - 5} more errors
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Upload Button */}
        <div className="flex justify-end space-x-2">
          <Button
            onClick={handleUpload}
            disabled={
              !file ||
              !preview ||
              preview.vendor.includes("Unknown") ||
              uploading ||
              (validationResults?.valid || 0) === 0
            }
            className="min-w-32"
          >
            {uploading ? (
              <>
                <FileText className="mr-2 h-4 w-4 animate-pulse" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </>
            )}
          </Button>
        </div>

        {/* Format Examples */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Supported CSV Formats</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-blue-100 dark:border-blue-900">
              <CardHeader className="bg-blue-50 dark:bg-blue-950/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Vendor A Vending
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm font-mono bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-blue-600 dark:text-blue-400 font-semibold mb-2">Headers:</div>
                  <div className="text-gray-600 dark:text-gray-300 mb-4">
                    Location_ID, Product_Name, Scancode, Trans_Date, Price, Total_Amount
                  </div>
                  <div className="text-blue-600 dark:text-blue-400 font-semibold mb-2">Example Row:</div>
                  <div className="text-gray-600 dark:text-gray-300">
                    2.0_SW_02, Celsius Arctic, 889392014, 06/09/2025, 3.50, 3.82
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100 dark:border-purple-900">
              <CardHeader className="bg-purple-50 dark:bg-purple-950/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Vendor B Systems
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm font-mono bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-purple-600 dark:text-purple-400 font-semibold mb-2">Headers:</div>
                  <div className="text-gray-600 dark:text-gray-300 mb-4">
                    Site_Code, Item_Description, UPC, Sale_Date, Unit_Price, Final_Total
                  </div>
                  <div className="text-purple-600 dark:text-purple-400 font-semibold mb-2">Example Row:</div>
                  <div className="text-gray-600 dark:text-gray-300">
                    SW_02, Celsius Arctic Berry, 889392014, 2025-06-09, 3.50, 3.82
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
