import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Toolbar } from './Toolbar';
import { AlignmentMode } from './AlignmentMode';
import { clearAppState } from '../utils/storage';

interface FullscreenViewerProps {
  onUploadReference: (file: File) => void;
  onLiveMode: () => void;
  isReady: boolean;
}

export function FullscreenViewer({
  onUploadReference,
  onLiveMode,
  isReady
}: FullscreenViewerProps) {
  const {
    referenceImageData,
    paintingImageData,
    alignmentMode,
    setAlignmentMode,
    savedPaintingTransform,
    hasReference,
    hasPainting
  } = useAppContext();

  const [showingPainting, setShowingPainting] = useState(false);
  const [transformedPaintingUrl, setTransformedPaintingUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Pre-generate transformed painting image whenever data changes (so it's ready instantly)
  useEffect(() => {
    if (savedPaintingTransform && referenceImageData && paintingImageData) {
      const refImg = new Image();
      const paintImg = new Image();
      let loadCount = 0;

      function bothLoaded() {
        loadCount++;
        if (loadCount === 2) {
          const canvas = document.createElement('canvas');
          canvas.width = refImg.width;
          canvas.height = refImg.height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.save();
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            const offsetX = savedPaintingTransform.offsetXRatio * refImg.width;
            const offsetY = savedPaintingTransform.offsetYRatio * refImg.height;

            ctx.translate(centerX + offsetX, centerY + offsetY);
            ctx.rotate((savedPaintingTransform.rotation * Math.PI) / 180);
            ctx.scale(savedPaintingTransform.scale, savedPaintingTransform.scale);

            ctx.drawImage(paintImg, -paintImg.width / 2, -paintImg.height / 2, paintImg.width, paintImg.height);
            ctx.restore();

            setTransformedPaintingUrl(canvas.toDataURL());
          }
        }
      }

      refImg.onload = bothLoaded;
      paintImg.onload = bothLoaded;
      refImg.src = referenceImageData;
      paintImg.src = paintingImageData;
    }
  }, [savedPaintingTransform, referenceImageData, paintingImageData]);

  // Calculate display size based on reference image
  useEffect(() => {
    if (!referenceImageData || !imgRef.current || alignmentMode) return;

    const refImg = new Image();
    refImg.onload = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const aspectRatio = refImg.width / refImg.height;

      let displayWidth = viewportWidth * 0.95;
      let displayHeight = displayWidth / aspectRatio;

      if (displayHeight > viewportHeight * 0.9) {
        displayHeight = viewportHeight * 0.9;
        displayWidth = displayHeight * aspectRatio;
      }

      if (imgRef.current) {
        imgRef.current.style.width = displayWidth + 'px';
        imgRef.current.style.height = displayHeight + 'px';
      }
    };
    refImg.src = referenceImageData;
  }, [referenceImageData, alignmentMode]);

  const handleMouseDown = () => {
    if (!alignmentMode) {
      setShowingPainting(true);
    }
  };

  const handleMouseUp = () => {
    if (!alignmentMode) {
      setShowingPainting(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!alignmentMode) {
      e.preventDefault();
      setShowingPainting(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!alignmentMode) {
      e.preventDefault();
      setShowingPainting(false);
    }
  };

  const handleSettings = () => {
    setAlignmentMode(true);
  };

  const handleDoneSettings = () => {
    setAlignmentMode(false);
  };

  const handleClearAll = async () => {
    if (confirm('Clear all saved data and reload? This will remove reference image, art image, and all settings.')) {
      try {
        await clearAppState();
        window.location.reload();
      } catch (error) {
        console.error('Failed to clear data:', error);
        alert('Failed to clear data. Try refreshing the page.');
      }
    }
  };

  // Determine what image to show
  const getImageSrc = () => {
    if (showingPainting && paintingImageData) {
      if (transformedPaintingUrl) {
        return transformedPaintingUrl;
      }
      return paintingImageData;
    }
    return referenceImageData;
  };

  const imageSrc = getImageSrc();
  const showImage = !!imageSrc && !alignmentMode;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Instructions when no images */}
      {!showImage && !alignmentMode && (
        <div style={{
          color: '#999',
          fontSize: '1.1rem',
          pointerEvents: 'none',
          maxWidth: '600px',
          padding: '2rem',
          textAlign: 'left',
          lineHeight: '1.8'
        }}>
          <div style={{
            fontSize: '1.4rem',
            marginBottom: '1.5rem',
            color: '#ccc',
            fontWeight: '500'
          }}>
            Getting Started
          </div>

          <div style={{ marginBottom: '0.8rem', textDecoration: hasReference ? 'line-through' : 'none', opacity: hasReference ? 0.5 : 1 }}>
            1. Add reference image
          </div>

          <div style={{ marginBottom: '0.8rem', textDecoration: hasPainting ? 'line-through' : 'none', opacity: hasPainting ? 0.5 : 1 }}>
            2. Add canvas image
          </div>

          <div style={{ marginBottom: '0.8rem' }}>
            3. Edit canvas via settings if needed
          </div>

          <div style={{ marginBottom: '0.8rem' }}>
            4. Press screen to toggle between reference and canvas
          </div>
        </div>
      )}

      {/* Image display */}
      {showImage && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Comparison"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            pointerEvents: 'none',
            imageRendering: 'high-quality',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)'
          }}
        />
      )}

      {/* Settings mode */}
      {alignmentMode && <AlignmentMode onDone={handleDoneSettings} onClearAll={handleClearAll} />}

      {/* Toolbar */}
      <Toolbar
        onUploadReference={onUploadReference}
        onLiveMode={onLiveMode}
        onSettings={handleSettings}
        isReady={isReady}
      />
    </div>
  );
}
