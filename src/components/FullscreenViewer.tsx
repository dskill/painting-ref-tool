import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Toolbar } from './Toolbar';
import { AlignmentMode } from './AlignmentMode';

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
    savedPaintingTransform
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

  const handleAlign = () => {
    setAlignmentMode(true);
  };

  const handleDoneAlign = () => {
    setAlignmentMode(false);
  };

  const handleClearAll = () => {
    // Reload the page to reset everything
    window.location.reload();
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
      {/* No image text */}
      {!showImage && !alignmentMode && (
        <div style={{ color: '#666', fontSize: '1.5rem', pointerEvents: 'none' }}>
          no image
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
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Alignment mode */}
      {alignmentMode && <AlignmentMode onDone={handleDoneAlign} />}

      {/* Toolbar */}
      <Toolbar
        onUploadReference={onUploadReference}
        onLiveMode={onLiveMode}
        onAlign={handleAlign}
        onClearAll={handleClearAll}
        isReady={isReady}
      />
    </div>
  );
}
