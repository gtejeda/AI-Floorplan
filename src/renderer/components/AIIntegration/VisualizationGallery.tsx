/**
 * VisualizationGallery Component
 *
 * Displays multi-perspective AI-generated images (site-plan, aerial, context).
 * Supports image zoom, preview, and approval workflow.
 */

import React, { useState, useEffect } from 'react';
import type { ViewType, ProjectVisualization } from '../../models/ProjectVisualization';
import { PromptEditorModal } from './PromptEditorModal';
import './VisualizationGallery.css';

interface VisualizationGalleryProps {
  visualizations: ProjectVisualization[];
  projectId: string;
  planId: string;
  isGenerating: {
    sitePlan: boolean;
    aerial: boolean;
    context: boolean;
  };
  progress: {
    sitePlan: number;
    aerial: number;
    context: number;
  };
  onSaveToProject?: (visualizationId: string) => Promise<void>;
  onApprove?: (visualizationId: string) => Promise<void>;
  onRegenerate?: (viewType: ViewType, customPrompt?: string) => void;
}

export function VisualizationGallery({
  visualizations,
  projectId,
  planId,
  isGenerating,
  progress,
  onSaveToProject,
  onApprove,
  onRegenerate,
}: VisualizationGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ProjectVisualization | null>(null);
  const [zoomedView, setZoomedView] = useState<ViewType | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [imageDataUrls, setImageDataUrls] = useState<Record<string, string>>({});
  const [promptEditorState, setPromptEditorState] = useState<{
    isOpen: boolean;
    viewType: ViewType | null;
    prompt: string;
  }>({
    isOpen: false,
    viewType: null,
    prompt: '',
  });
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [showSitePlanOverlay, setShowSitePlanOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [imageRotation, setImageRotation] = useState(0); // Rotation angle in degrees

  // Carousel state - track current index for each view type
  const [carouselIndex, setCarouselIndex] = useState<Record<ViewType, number>>({
    'site-plan': 0,
    aerial: 0,
    context: 0,
  });

  // Get all visualizations for a specific view type
  const getVisualizationsByType = (viewType: ViewType): ProjectVisualization[] => {
    return visualizations.filter((v) => v.viewType === viewType);
  };

  // Get current visualization for a view type based on carousel index
  const getCurrentVisualization = (viewType: ViewType): ProjectVisualization | undefined => {
    const vizList = getVisualizationsByType(viewType);
    const index = carouselIndex[viewType];
    return vizList[index];
  };

  // Navigate to next image in carousel
  const nextImage = (viewType: ViewType) => {
    const vizList = getVisualizationsByType(viewType);
    if (vizList.length > 1) {
      setCarouselIndex((prev) => ({
        ...prev,
        [viewType]: (prev[viewType] + 1) % vizList.length,
      }));
    }
  };

  // Navigate to previous image in carousel
  const prevImage = (viewType: ViewType) => {
    const vizList = getVisualizationsByType(viewType);
    if (vizList.length > 1) {
      setCarouselIndex((prev) => ({
        ...prev,
        [viewType]: prev[viewType] === 0 ? vizList.length - 1 : prev[viewType] - 1,
      }));
    }
  };

  // Jump to specific index in carousel
  const goToImage = (viewType: ViewType, index: number) => {
    setCarouselIndex((prev) => ({
      ...prev,
      [viewType]: index,
    }));
  };

  // Load images as data URLs when visualizations change
  useEffect(() => {
    const loadImages = async () => {
      const newDataUrls: Record<string, string> = {};

      for (const viz of visualizations) {
        if (viz.localPath && !imageDataUrls[viz.id]) {
          try {
            const imageUrl = await window.aiService.loadImageAsDataUrl(viz.localPath);
            newDataUrls[viz.id] = imageUrl;
          } catch (error) {
            console.error(
              `[VisualizationGallery] Failed to load image for ${viz.id} (${viz.viewType}):`,
              error
            );
          }
        }
      }

      if (Object.keys(newDataUrls).length > 0) {
        setImageDataUrls((prev) => ({ ...prev, ...newDataUrls }));
      }
    };

    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualizations]); // Only depend on visualizations, not imageDataUrls (would cause infinite loop)

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && zoomedView) {
        setZoomedView(null);
        setIsMaximized(false);
        setShowSitePlanOverlay(false); // Reset overlay when closing
      }
    };

    if (zoomedView) {
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [zoomedView]);

  // Get the site plan visualization for overlay
  const getSitePlanForOverlay = (): ProjectVisualization | undefined => {
    const sitePlans = getVisualizationsByType('site-plan');
    return sitePlans[carouselIndex['site-plan']];
  };

  // Rotate image by 45 degrees
  const rotateImage = () => {
    setImageRotation((prev) => (prev + 45) % 360);
  };

  // Reset rotation when changing images or closing modal
  useEffect(() => {
    setImageRotation(0);
  }, [zoomedView, carouselIndex]);

  // Handle generate button click - fetch prompt and open editor
  const handleGenerateClick = async (viewType: ViewType) => {
    setIsLoadingPrompt(true);
    try {
      const promptPreview = await window.aiService.previewImagePrompt({
        projectId,
        subdivisionPlanId: planId,
        viewType,
        resolution: '1024x1024',
      });

      setPromptEditorState({
        isOpen: true,
        viewType,
        prompt: promptPreview.prompt,
      });
    } catch (error) {
      console.error('Failed to fetch prompt:', error);
      alert('Failed to load prompt. Please try again.');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  // Handle prompt confirm - trigger generation with custom prompt
  const handlePromptConfirm = (editedPrompt: string) => {
    if (promptEditorState.viewType && onRegenerate) {
      // Extract custom additions by comparing with original prompt
      const customAdditions = editedPrompt !== promptEditorState.prompt ? editedPrompt : undefined;
      onRegenerate(promptEditorState.viewType, customAdditions);
    }

    // Close modal
    setPromptEditorState({
      isOpen: false,
      viewType: null,
      prompt: '',
    });
  };

  // Handle prompt cancel
  const handlePromptCancel = () => {
    setPromptEditorState({
      isOpen: false,
      viewType: null,
      prompt: '',
    });
  };

  const renderImageCard = (viewType: ViewType, title: string, description: string) => {
    const visualizationList = getVisualizationsByType(viewType);
    const visualization = getCurrentVisualization(viewType);
    const currentIndex = carouselIndex[viewType];
    const hasMultiple = visualizationList.length > 1;

    const generating = isGenerating[viewType === 'site-plan' ? 'sitePlan' : viewType];
    const currentProgress = progress[viewType === 'site-plan' ? 'sitePlan' : viewType];

    // Check dependencies for each view type
    const sitePlanList = getVisualizationsByType('site-plan');
    const aerialList = getVisualizationsByType('aerial');

    let dependencyMissing = false;
    let dependencyMessage = '';

    if (viewType === 'aerial') {
      // Aerial requires site plan
      dependencyMissing = sitePlanList.length === 0;
      dependencyMessage = 'Site Plan';
    } else if (viewType === 'context') {
      // Context requires aerial
      dependencyMissing = aerialList.length === 0;
      dependencyMessage = 'Aerial View';
    }

    return (
      <div className={`image-card ${generating ? 'generating' : ''} ${dependencyMissing ? 'disabled' : ''}`}>
        <div className="image-card-header">
          <div className="header-title-row">
            <h3>{title}</h3>
            {hasMultiple && (
              <span className="image-counter">
                {currentIndex + 1} / {visualizationList.length}
              </span>
            )}
          </div>
          <p className="image-card-description">{description}</p>
        </div>

        <div className="image-card-content">
          {generating ? (
            <div className="image-loading">
              <div className="loading-spinner"></div>
              <div className="loading-progress">
                <div
                  className="loading-progress-bar"
                  style={{ width: `${currentProgress}%` }}
                ></div>
              </div>
              <p className="loading-text">
                Generating {title.toLowerCase()}... {Math.round(currentProgress)}%
              </p>
            </div>
          ) : visualization ? (
            <div className="image-preview-container">
              <div
                className="image-preview"
                onClick={() => {
                  setZoomedView(viewType);
                  setIsMaximized(true);
                }}
                role="button"
                tabIndex={0}
              >
                {imageDataUrls[visualization.id] ? (
                  <>
                    <img
                      src={imageDataUrls[visualization.id]}
                      alt={`${title} ${currentIndex + 1}`}
                      className="preview-image"
                    />
                    <div className="image-overlay">
                      <span className="zoom-icon">🔍</span>
                      <span className="view-label">Click to enlarge</span>
                    </div>
                  </>
                ) : (
                  <div className="image-loading">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading image...</p>
                  </div>
                )}
              </div>

              {/* Carousel Controls */}
              {hasMultiple && (
                <>
                  <button
                    className="carousel-nav carousel-prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage(viewType);
                    }}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    className="carousel-nav carousel-next"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage(viewType);
                    }}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="carousel-dots">
                    {visualizationList.map((_, index) => (
                      <button
                        key={index}
                        className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToImage(viewType, index);
                        }}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : dependencyMissing ? (
            <div className="image-placeholder locked">
              <div className="placeholder-icon">🔒</div>
              <p className="locked-message">Generate {dependencyMessage} First</p>
              <p className="locked-hint">
                The {dependencyMessage.toLowerCase()} is required as reference for generating {title.toLowerCase()}
              </p>
            </div>
          ) : (
            <div className="image-placeholder">
              <div className="placeholder-icon">🖼️</div>
              <p>No image generated yet</p>
              {onRegenerate && (
                <button
                  className="btn-generate"
                  onClick={() => handleGenerateClick(viewType)}
                  disabled={isLoadingPrompt}
                >
                  {isLoadingPrompt ? 'Loading prompt...' : `Generate ${title}`}
                </button>
              )}
            </div>
          )}
        </div>

        {visualization && !generating && (
          <div className="image-card-footer">
            <div className="image-meta">
              <span className="meta-item">
                {visualization.widthPixels} × {visualization.heightPixels}
              </span>
              <span className="meta-item">{(visualization.sizeBytes / 1024).toFixed(0)} KB</span>
              <span
                className={`meta-item status-${visualization.isApproved ? 'approved' : 'pending'}`}
              >
                {visualization.isApproved ? '✓ Approved' : 'Pending Review'}
              </span>
            </div>

            <div className="image-actions">
              {!visualization.isApproved && onApprove && (
                <button className="btn-approve" onClick={() => onApprove(visualization.id)}>
                  Approve
                </button>
              )}
              {onSaveToProject && (
                <button
                  className="btn-save"
                  onClick={() => onSaveToProject(visualization.id)}
                  disabled={!visualization.isApproved}
                >
                  Save to Project
                </button>
              )}
              {onRegenerate && (
                <button
                  className="btn-regenerate"
                  onClick={() => handleGenerateClick(viewType)}
                  disabled={isLoadingPrompt}
                >
                  {isLoadingPrompt ? 'Loading...' : 'Regenerate'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="visualization-gallery">
      <div className="gallery-header">
        <h2>Project Visualizations</h2>
        <p className="gallery-subtitle">
          AI-generated architectural views of your subdivision plan
        </p>
      </div>

      <div className="gallery-grid">
        {renderImageCard(
          'site-plan',
          'Site Plan View',
          'Top-down 2D architectural drawing showing lot layouts and dimensions'
        )}
        {renderImageCard(
          'aerial',
          'Aerial View',
          '45-degree view showing land allocation - grass lots with social club built'
        )}
        {renderImageCard(
          'context',
          'Context View',
          'Ground-level view showing fully built villas in surrounding landscape'
        )}
      </div>

      {zoomedView && (
        <div
          className="image-modal"
          onClick={() => {
            setZoomedView(null);
            setIsMaximized(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`modal-content ${isMaximized ? 'maximized' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => {
                setZoomedView(null);
                setIsMaximized(false);
              }}
              aria-label="Close"
            >
              ✕
            </button>
            <button
              className="modal-maximize"
              onClick={() => setIsMaximized(!isMaximized)}
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? '⤓' : '⤢'}
            </button>
            <button
              className="modal-rotate"
              onClick={rotateImage}
              aria-label="Rotate 45°"
              title={`Rotate 45° (current: ${imageRotation}°)`}
            >
              ↻
            </button>

            {(() => {
              const modalVizList = getVisualizationsByType(zoomedView);
              const modalViz = getCurrentVisualization(zoomedView);
              const modalIndex = carouselIndex[zoomedView];
              const modalHasMultiple = modalVizList.length > 1;
              const sitePlanViz = getSitePlanForOverlay();
              const canShowOverlay = (zoomedView === 'aerial' || zoomedView === 'context') && sitePlanViz;

              // Check if image is tall (portrait orientation)
              const isTallImage = modalViz && modalViz.heightPixels > modalViz.widthPixels * 1.3;

              return (
                <>
                  {modalViz && imageDataUrls[modalViz.id] ? (
                    <div className="modal-image-container">
                      {/* Show rotation hint for tall images */}
                      {isTallImage && imageRotation === 0 && (
                        <div className="rotation-hint">
                          💡 Tip: Click the rotate button (↻) to view this tall plot at 45°
                        </div>
                      )}
                      <img
                        src={imageDataUrls[modalViz.id]}
                        alt={`${zoomedView} enlarged - ${modalIndex + 1} of ${modalVizList.length}`}
                        className="modal-image"
                        style={{
                          transform: `rotate(${imageRotation}deg)`,
                          transition: 'transform 0.5s ease',
                        }}
                      />

                      {/* Site Plan Overlay */}
                      {canShowOverlay && showSitePlanOverlay && sitePlanViz && imageDataUrls[sitePlanViz.id] && (
                        <img
                          src={imageDataUrls[sitePlanViz.id]}
                          alt="Site plan overlay"
                          className="site-plan-overlay"
                          style={{
                            opacity: overlayOpacity,
                            transform: `rotate(${imageRotation}deg)`,
                            transition: 'transform 0.5s ease, opacity 0.3s ease',
                          }}
                        />
                      )}

                      {/* Overlay Controls */}
                      {canShowOverlay && (
                        <div className="overlay-controls">
                          <button
                            className={`btn-overlay-toggle ${showSitePlanOverlay ? 'active' : ''}`}
                            onClick={() => setShowSitePlanOverlay(!showSitePlanOverlay)}
                            title="Toggle site plan overlay"
                          >
                            {showSitePlanOverlay ? '🗺️ Hide' : '🗺️ Show'} Site Plan
                          </button>
                          {showSitePlanOverlay && (
                            <div className="overlay-opacity-control">
                              <label htmlFor="overlay-opacity">Opacity:</label>
                              <input
                                id="overlay-opacity"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={overlayOpacity}
                                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                className="opacity-slider"
                              />
                              <span className="opacity-value">{Math.round(overlayOpacity * 100)}%</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Modal Carousel Controls */}
                      {modalHasMultiple && (
                        <>
                          <button
                            className="modal-carousel-nav modal-carousel-prev"
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage(zoomedView);
                            }}
                            aria-label="Previous image"
                          >
                            ‹
                          </button>
                          <button
                            className="modal-carousel-nav modal-carousel-next"
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage(zoomedView);
                            }}
                            aria-label="Next image"
                          >
                            ›
                          </button>
                          <div className="modal-carousel-dots">
                            {modalVizList.map((_, index) => (
                              <button
                                key={index}
                                className={`modal-carousel-dot ${index === modalIndex ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToImage(zoomedView, index);
                                }}
                                aria-label={`Go to image ${index + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="image-loading">
                      <div className="loading-spinner"></div>
                      <p className="loading-text">Loading image...</p>
                    </div>
                  )}
                  {!isMaximized && (
                    <div className="modal-footer">
                      <div className="modal-footer-header">
                        <h3>
                          {zoomedView === 'site-plan'
                            ? 'Site Plan View'
                            : zoomedView === 'aerial'
                              ? 'Aerial View'
                              : 'Context View'}
                        </h3>
                        {modalHasMultiple && (
                          <span className="modal-image-counter">
                            {modalIndex + 1} / {modalVizList.length}
                          </span>
                        )}
                      </div>
                      {modalViz?.caption && <p className="image-caption">{modalViz.caption}</p>}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Prompt Editor Modal */}
      <PromptEditorModal
        isOpen={promptEditorState.isOpen}
        viewType={promptEditorState.viewType || 'site-plan'}
        initialPrompt={promptEditorState.prompt}
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
      />
    </div>
  );
}
