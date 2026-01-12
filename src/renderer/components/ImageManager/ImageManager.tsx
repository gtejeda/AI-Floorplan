/**
 * ImageManager Component (T153-T160)
 * Handles image upload, preview, and management for land parcels and lots
 *
 * Features:
 * - Upload images to land parcel (T154)
 * - Upload images to specific lots (T155)
 * - Import AI-generated images (T156)
 * - Display thumbnails in grid layout (T157)
 * - Full-size image preview modal (T158)
 */

import React, { useState, useEffect } from 'react';
import { ProjectImage } from '../../models/ProjectImage';

interface ImageManagerProps {
  projectId: string;
  associationType: 'land-parcel' | 'lot';
  lotId?: string; // Required if associationType is 'lot'
  targetDirectory?: string; // For AI image import
}

interface ImageWithThumbnail extends ProjectImage {
  thumbnailDataUrl?: string;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
  projectId,
  associationType,
  lotId,
  targetDirectory
}) => {
  const [images, setImages] = useState<ImageWithThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageWithThumbnail | null>(null);

  // Load images on component mount
  useEffect(() => {
    loadImages();
  }, [projectId, associationType, lotId]);

  // Load thumbnails for images
  useEffect(() => {
    if (images.length > 0) {
      loadThumbnails();
    }
  }, [images.length]);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const allImages = await window.electronAPI.getImagesByProject(projectId);

      // Filter images based on association type
      const filtered = allImages.filter((img: ProjectImage) => {
        if (associationType === 'land-parcel') {
          return img.associatedWith === 'land-parcel';
        } else {
          return img.associatedWith === 'lot' && img.lotId === lotId;
        }
      });

      setImages(filtered);
    } catch (err: any) {
      console.error('Error loading images:', err);
      setError(`Failed to load images: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadThumbnails = async () => {
    try {
      const imagesWithThumbnails = await Promise.all(
        images.map(async (img) => {
          try {
            const result = await window.electronAPI.getImageThumbnail(img.id);
            return {
              ...img,
              thumbnailDataUrl: result.dataUrl
            };
          } catch (err) {
            console.error(`Error loading thumbnail for ${img.id}:`, err);
            return img;
          }
        })
      );

      setImages(imagesWithThumbnails);
    } catch (err) {
      console.error('Error loading thumbnails:', err);
    }
  };

  // T154: Upload images to land parcel
  const handleUploadToLand = async () => {
    try {
      setLoading(true);
      setError(null);

      // Open file dialog
      const result = await window.electronAPI.selectImages();

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        setLoading(false);
        return;
      }

      // Upload images
      const uploadResult = await window.electronAPI.attachImagesToLand({
        projectId,
        filePaths: result.filePaths
      });

      if (uploadResult.success) {
        // Reload images
        await loadImages();
      } else {
        setError('Some images failed to upload. Check console for details.');
      }
    } catch (err: any) {
      console.error('Error uploading images:', err);
      setError(`Failed to upload images: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // T155: Upload images to specific lot
  const handleUploadToLot = async () => {
    if (!lotId) {
      setError('Lot ID is required for lot image upload');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Open file dialog
      const result = await window.electronAPI.selectImages();

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        setLoading(false);
        return;
      }

      // Upload images
      const uploadResult = await window.electronAPI.attachImagesToLot({
        projectId,
        lotId,
        filePaths: result.filePaths
      });

      if (uploadResult.success) {
        // Reload images
        await loadImages();
      } else {
        setError('Some images failed to upload. Check console for details.');
      }
    } catch (err: any) {
      console.error('Error uploading images:', err);
      setError(`Failed to upload images: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // T156: Import AI-generated images
  const handleImportAIImages = async () => {
    if (!targetDirectory) {
      setError('Target directory is required for AI image import');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const importResult = await window.electronAPI.importAIGeneratedImages({
        projectId,
        targetDirectory
      });

      if (importResult.success) {
        // Reload images
        await loadImages();

        // Show success message
        alert(`Successfully imported ${importResult.importedCount} images. Skipped ${importResult.skippedCount} files.`);
      }
    } catch (err: any) {
      console.error('Error importing AI images:', err);
      setError(`Failed to import AI images: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // T158: Handle thumbnail click to show full-size preview
  const handleThumbnailClick = (image: ImageWithThumbnail) => {
    setPreviewImage(image);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  return (
    <div className="image-manager">
      <div className="image-manager-header">
        <h3>
          {associationType === 'land-parcel'
            ? 'Land Parcel Images'
            : `Lot ${lotId} Images`}
        </h3>

        <div className="image-manager-actions">
          {/* T154: Upload to Land Parcel button */}
          {associationType === 'land-parcel' && (
            <button
              onClick={handleUploadToLand}
              disabled={loading}
              className="btn btn-primary"
            >
              Upload Images to Land Parcel
            </button>
          )}

          {/* T155: Upload to Lot button */}
          {associationType === 'lot' && (
            <button
              onClick={handleUploadToLot}
              disabled={loading}
              className="btn btn-primary"
            >
              Upload Images to Lot
            </button>
          )}

          {/* T156: Import AI-Generated Images button */}
          {associationType === 'land-parcel' && targetDirectory && (
            <button
              onClick={handleImportAIImages}
              disabled={loading}
              className="btn btn-secondary"
            >
              Import AI-Generated Images
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="loading">
          Loading images...
        </div>
      )}

      {/* T157: Thumbnail grid */}
      {!loading && images.length > 0 && (
        <div className="image-grid">
          {images.map((image) => (
            <div
              key={image.id}
              className="image-thumbnail-container"
              onClick={() => handleThumbnailClick(image)}
            >
              {image.thumbnailDataUrl ? (
                <img
                  src={image.thumbnailDataUrl}
                  alt={image.filename}
                  className="image-thumbnail"
                />
              ) : (
                <div className="image-thumbnail-placeholder">
                  Loading...
                </div>
              )}

              <div className="image-thumbnail-info">
                <span className="image-filename">{image.filename}</span>
                <span className="image-size">
                  {(image.size / 1024).toFixed(2)} KB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && images.length === 0 && (
        <div className="empty-state">
          <p>No images uploaded yet.</p>
          <p>
            {associationType === 'land-parcel'
              ? 'Click "Upload Images to Land Parcel" to add images.'
              : 'Click "Upload Images to Lot" to add images.'}
          </p>
        </div>
      )}

      {/* T158: Full-size preview modal */}
      {previewImage && (
        <div className="image-preview-modal" onClick={closePreview}>
          <div className="image-preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closePreview}>×</button>

            <img
              src={`file://${previewImage.localPath}`}
              alt={previewImage.filename}
              className="image-preview-full"
            />

            <div className="image-preview-info">
              <h4>{previewImage.filename}</h4>
              <div className="image-metadata">
                <span>Format: {previewImage.format.toUpperCase()}</span>
                <span>Size: {(previewImage.size / 1024).toFixed(2)} KB</span>
                <span>Dimensions: {previewImage.width} × {previewImage.height}px</span>
                <span>Uploaded: {new Date(previewImage.uploadedAt).toLocaleString()}</span>
              </div>

              {previewImage.caption && (
                <p className="image-caption">{previewImage.caption}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .image-manager {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .image-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .image-manager-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .image-manager-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #10b981;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #059669;
        }

        .alert {
          padding: 0.75rem 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .image-thumbnail-container {
          cursor: pointer;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
          background: white;
        }

        .image-thumbnail-container:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .image-thumbnail {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }

        .image-thumbnail-placeholder {
          width: 100%;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #9ca3af;
        }

        .image-thumbnail-info {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .image-filename {
          font-size: 0.875rem;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .image-size {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }

        .empty-state p {
          margin: 0.5rem 0;
        }

        .image-preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .image-preview-modal-content {
          position: relative;
          max-width: 90%;
          max-height: 90%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 2.5rem;
          height: 2.5rem;
          border: none;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          font-size: 1.5rem;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .close-btn:hover {
          background: rgba(0, 0, 0, 0.7);
        }

        .image-preview-full {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
        }

        .image-preview-info {
          padding: 1.5rem;
          background: #f9fafb;
        }

        .image-preview-info h4 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
        }

        .image-metadata {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .image-caption {
          margin-top: 1rem;
          font-style: italic;
          color: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default ImageManager;
