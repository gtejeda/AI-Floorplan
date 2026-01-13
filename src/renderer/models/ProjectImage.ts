/**
 * ProjectImage - Images associated with land parcel and individual lots
 *
 * Images can be:
 * - Uploaded by user (via file dialog)
 * - AI-generated (imported from project target directory)
 *
 * Storage:
 * - Metadata in SQLite (project_images table)
 * - Files in local file system
 * - Thumbnails generated for UI performance
 */

export interface ProjectImage {
  // Identity
  id: string; // UUID v4
  projectId: string; // Foreign key

  // Association
  associatedWith: 'land-parcel' | 'lot';
  lotId?: string; // If associated with specific lot

  // File Information
  filename: string; // Original filename
  format: 'jpeg' | 'png' | 'webp';
  size: number; // bytes
  width: number; // pixels
  height: number; // pixels

  // Storage
  localPath: string; // Absolute path on user's file system
  thumbnailPath?: string; // Optional thumbnail (for UI performance)

  // Metadata
  uploadedAt: Date;
  caption?: string; // Optional user description
}

export interface ImageMetadata {
  // File validation
  isValid: boolean;
  validationErrors?: string[];

  // Extracted metadata
  format: 'jpeg' | 'png' | 'webp';
  size: number; // bytes
  width: number; // pixels
  height: number; // pixels

  // EXIF data (optional)
  exif?: {
    dateTaken?: Date;
    cameraModel?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

/**
 * Validation rules for ProjectImage
 */
export const IMAGE_VALIDATION_RULES = {
  // FR-076: Supported formats
  ALLOWED_FORMATS: ['jpeg', 'jpg', 'png', 'webp'] as const,

  // FR-077: File size limits
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB

  // Thumbnail generation
  THUMBNAIL_MAX_WIDTH: 200,
  THUMBNAIL_MAX_HEIGHT: 200,

  // File extensions
  FILE_EXTENSIONS: {
    jpeg: ['.jpg', '.jpeg'],
    png: ['.png'],
    webp: ['.webp'],
  },
} as const;

/**
 * Image upload result
 */
export interface ImageUploadResult {
  success: boolean;
  imageId?: string;
  error?: string;
  validationErrors?: string[];
}

/**
 * AI-generated image import result
 */
export interface AIImageImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors?: string[];
  importedImages?: ProjectImage[];
}

/**
 * Image association options
 */
export interface ImageAssociationOptions {
  associatedWith: 'land-parcel' | 'lot';
  lotId?: string; // Required if associatedWith is 'lot'
  caption?: string;
}
