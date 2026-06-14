import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import FileUploadService, { UploadResult } from '@/services/fileUpload';

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number;
  onFileSelect?: (file: File) => void;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  showPreview?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  customUploadMethod?: 'moviePoster' | 'userAvatar' | 'creatorProfile';
}

const FileUpload: React.FC<FileUploadProps> = ({
  label = 'Upload File',
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB
  onFileSelect,
  onUploadComplete,
  onUploadError,
  showPreview = true,
  className = '',
  disabled = false,
  required = false,
  customUploadMethod
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file
    if (!FileUploadService.isImage(file) && accept.includes('image/*')) {
      onUploadError?.('Please select a valid image file');
      return;
    }

    if (file.size > maxSize) {
      onUploadError?.(`File size must be less than ${FileUploadService.formatFileSize(maxSize)}`);
      return;
    }

    setSelectedFile(file);
    onFileSelect?.(file);

    // Create preview if it's an image
    if (showPreview && FileUploadService.isImage(file)) {
      const url = FileUploadService.createPreviewUrl(file);
      setPreviewUrl(url);
    }

    // Reset upload result
    setUploadResult(null);
  }, [accept, maxSize, onFileSelect, onUploadError, showPreview]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const handleRemoveFile = () => {
    if (previewUrl) {
      FileUploadService.revokePreviewUrl(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      let result: UploadResult;
      
      switch (customUploadMethod) {
        case 'userAvatar':
          // For user avatars, we need a userId - this is a simplified version
          result = await FileUploadService.uploadUserAvatar(selectedFile, 'temp-user-id');
          break;
        case 'creatorProfile':
          result = await FileUploadService.uploadCreatorProfile(selectedFile);
          break;
        case 'moviePoster':
        default:
          result = await FileUploadService.uploadMoviePoster(selectedFile);
          break;
      }
      
      setUploadResult(result);
      
      if (result.success) {
        onUploadComplete?.(result);
      } else {
        onUploadError?.(result.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
      setUploadResult({ success: false, error: errorMessage });
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <Label htmlFor="file-upload" className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        id="file-upload"
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Area */}
      {!selectedFile && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!disabled ? openFileDialog : undefined}
        >
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {accept.includes('image/*') ? 'Images' : 'Files'} up to {FileUploadService.formatFileSize(maxSize)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && showPreview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {FileUploadService.isImage(selectedFile) ? (
                <Image className="h-4 w-4" />
              ) : (
                <File className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({FileUploadService.formatFileSize(selectedFile.size)})
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-32 object-cover rounded-lg border"
              />
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleUpload}
              disabled={disabled || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className={`p-3 rounded-lg border ${
              uploadResult.success
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {uploadResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {uploadResult.success ? 'Upload successful!' : 'Upload failed'}
                </span>
              </div>
              {uploadResult.error && (
                <p className="text-sm mt-1">{uploadResult.error}</p>
              )}
              {uploadResult.url && (
                <p className="text-sm mt-1 break-all">
                  <strong>URL:</strong> {uploadResult.url}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
