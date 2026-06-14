import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

export interface FileUploadOptions {
  bucket: string;
  path?: string;
  file: File;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
}

export class FileUploadService {
  private static readonly DEFAULT_BUCKET = 'uploads';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(options: FileUploadOptions): Promise<UploadResult> {
    try {
      const { bucket, path, file, allowedTypes, maxSize } = options;

      // Validate file
      const validationResult = this.validateFile(file, allowedTypes, maxSize);
      if (!validationResult.success) {
        return { success: false, error: validationResult.error };
      }

      // Generate unique filename
      const fileName = this.generateFileName(file);
      const filePath = path ? `${path}/${fileName}` : fileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload a movie poster
   */
  static async uploadMoviePoster(file: File): Promise<UploadResult> {
    return this.uploadFile({
      bucket: this.DEFAULT_BUCKET,
      path: 'posters',
      file,
      allowedTypes: this.ALLOWED_TYPES,
      maxSize: this.MAX_FILE_SIZE
    });
  }

  /**
   * Upload a user avatar
   */
  static async uploadUserAvatar(file: File, userId: string): Promise<UploadResult> {
    return this.uploadFile({
      bucket: this.DEFAULT_BUCKET,
      path: `avatars/${userId}`,
      file,
      allowedTypes: this.ALLOWED_TYPES,
      maxSize: this.MAX_FILE_SIZE
    });
  }

  /**
   * Upload a creator profile image
   */
  static async uploadCreatorProfile(file: File): Promise<UploadResult> {
    return this.uploadFile({
      bucket: this.DEFAULT_BUCKET,
      path: 'creators',
      file,
      allowedTypes: this.ALLOWED_TYPES,
      maxSize: this.MAX_FILE_SIZE
    });
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('File deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deletion error'
      };
    }
  }

  /**
   * Validate file before upload
   */
  private static validateFile(
    file: File, 
    allowedTypes?: string[], 
    maxSize?: number
  ): { success: boolean; error?: string } {
    const types = allowedTypes || this.ALLOWED_TYPES;
    const size = maxSize || this.MAX_FILE_SIZE;

    // Check file type
    if (!types.includes(file.type)) {
      return {
        success: false,
        error: `File type not allowed. Allowed types: ${types.join(', ')}`
      };
    }

    // Check file size
    if (file.size > size) {
      const maxSizeMB = (size / (1024 * 1024)).toFixed(1);
      return {
        success: false,
        error: `File too large. Maximum size: ${maxSizeMB}MB`
      };
    }

    return { success: true };
  }

  /**
   * Generate unique filename
   */
  private static generateFileName(file: File): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    return `${timestamp}-${random}.${extension}`;
  }

  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if file is an image
   */
  static isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Create image preview URL
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Revoke preview URL to free memory
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export default FileUploadService;
