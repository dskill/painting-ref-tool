import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';

export function AlignmentMode({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    referenceImageData,
    paintingImageData,
    paintingTransform,
    setPaintingTransform,
    savedPaintingTransform,
    setSavedPaintingTransform,
    projectAspectWidth,
    setProjectAspectWidth,
    projectAspectHeight,
    setProjectAspectHeight
  } = useAppContext();

  const [scaleDisplay, setScaleDisplay] = useState('100%');
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [pinchStart, setPinchStart] = useState({ distance: 0, scale: 1 });

  // Render the alignment view
  const renderAlignmentView = () => {
    const canvas = canvasRef.current;
    if (!canvas || !referenceImageData || !paintingImageData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const refImg = new Image();
    const paintImg = new Image();
    let loadCount = 0;

    function bothLoaded() {
      loadCount++;
      if (loadCount === 2 && ctx) {
        // Use reference image's native resolution
        canvas.width = refImg.width;
        canvas.height = refImg.height;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw reference image
        ctx.drawImage(refImg, 0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Set painting opacity
        ctx.globalAlpha = paintingTransform.opacity;

        // Transform for painting
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.translate(centerX + paintingTransform.offsetX, centerY + paintingTransform.offsetY);
        ctx.rotate((paintingTransform.rotation * Math.PI) / 180);
        ctx.scale(paintingTransform.scale, paintingTransform.scale);

        // Draw painting centered
        ctx.drawImage(paintImg, -paintImg.width / 2, -paintImg.height / 2, paintImg.width, paintImg.height);

        // Restore context
        ctx.restore();
      }
    }

    refImg.onload = bothLoaded;
    paintImg.onload = bothLoaded;
    refImg.src = referenceImageData;
    paintImg.src = paintingImageData;
  };

  // Initial render and restore saved transform
  useEffect(() => {
    if (savedPaintingTransform && referenceImageData) {
      const refImg = new Image();
      refImg.onload = () => {
        setPaintingTransform({
          scale: savedPaintingTransform.scale,
          rotation: savedPaintingTransform.rotation,
          offsetX: savedPaintingTransform.offsetXRatio * refImg.width,
          offsetY: savedPaintingTransform.offsetYRatio * refImg.height,
          opacity: paintingTransform.opacity
        });
        setScaleDisplay(Math.round(savedPaintingTransform.scale * 100) + '%');
      };
      refImg.src = referenceImageData;
    }
  }, []);

  useEffect(() => {
    renderAlignmentView();
  }, [paintingTransform, referenceImageData, paintingImageData]);

  // Calculate canvas scale factor
  const getCanvasScale = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const displayWidth = parseFloat(canvas.style.width || '0');
    return canvas.width / displayWidth;
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    const scale = getCanvasScale();
    setPaintingTransform({
      ...paintingTransform,
      offsetX: paintingTransform.offsetX + dx * scale,
      offsetY: paintingTransform.offsetY + dy * scale
    });
    setLastPos({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
    e.stopPropagation();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY / 1000;
    const newScale = Math.max(0.1, Math.min(3, paintingTransform.scale + delta));
    setPaintingTransform({ ...paintingTransform, scale: newScale });
    setScaleDisplay(Math.round(newScale * 100) + '%');
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setPinchStart({ distance, scale: paintingTransform.scale });
    }
    e.stopPropagation();
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastPos.x;
      const dy = e.touches[0].clientY - lastPos.y;
      const scale = getCanvasScale();
      setPaintingTransform({
        ...paintingTransform,
        offsetX: paintingTransform.offsetX + dx * scale,
        offsetY: paintingTransform.offsetY + dy * scale
      });
      setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(0.1, Math.min(3, (distance / pinchStart.distance) * pinchStart.scale));
      setPaintingTransform({ ...paintingTransform, scale: newScale });
      setScaleDisplay(Math.round(newScale * 100) + '%');
    }
    e.stopPropagation();
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsDragging(false);
    }
    e.stopPropagation();
    e.preventDefault();
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPaintingTransform({
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      opacity: 0.5
    });
    setScaleDisplay('100%');
    setSavedPaintingTransform(null);

    // Reset aspect ratio to match reference image
    if (referenceImageData) {
      const refImg = new Image();
      refImg.onload = () => {
        setProjectAspectWidth(refImg.width);
        setProjectAspectHeight(refImg.height);
      };
      refImg.src = referenceImageData;
    }
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Save transform as ratios
    if (referenceImageData) {
      const refImg = new Image();
      refImg.onload = () => {
        setSavedPaintingTransform({
          scale: paintingTransform.scale,
          rotation: paintingTransform.rotation,
          offsetXRatio: paintingTransform.offsetX / refImg.width,
          offsetYRatio: paintingTransform.offsetY / refImg.height
        });
      };
      refImg.src = referenceImageData;
    }

    onDone();
  };

  // Calculate canvas display size
  useEffect(() => {
    if (!referenceImageData || !canvasRef.current) return;

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

      if (canvasRef.current) {
        canvasRef.current.style.width = displayWidth + 'px';
        canvasRef.current.style.height = displayHeight + 'px';
      }
    };
    refImg.src = referenceImageData;
  }, [referenceImageData]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Alignment controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)',
          padding: '0.4rem 0.6rem',
          borderRadius: '6px',
          zIndex: 10,
          maxWidth: '90vw'
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ color: 'white', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Canvas</label>
            <input
              type="number"
              min="1"
              max="10000"
              value={projectAspectWidth}
              onChange={(e) => setProjectAspectWidth(parseInt(e.target.value) || 1)}
              style={{
                width: '60px',
                padding: '0.25rem',
                fontSize: '0.7rem',
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid #ccc',
                borderRadius: '3px'
              }}
            />
            <span style={{ color: 'white', fontSize: '0.7rem' }}>×</span>
            <input
              type="number"
              min="1"
              max="10000"
              value={projectAspectHeight}
              onChange={(e) => setProjectAspectHeight(parseInt(e.target.value) || 1)}
              style={{
                width: '60px',
                padding: '0.25rem',
                fontSize: '0.7rem',
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid #ccc',
                borderRadius: '3px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '120px' }}>
            <label style={{ color: 'white', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Rotate</label>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={paintingTransform.rotation}
              onChange={(e) => setPaintingTransform({ ...paintingTransform, rotation: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'white', fontSize: '0.65rem', minWidth: '30px' }}>{paintingTransform.rotation}°</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '120px' }}>
            <label style={{ color: 'white', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={paintingTransform.opacity}
              onChange={(e) => setPaintingTransform({ ...paintingTransform, opacity: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'white', fontSize: '0.65rem', minWidth: '30px' }}>{Math.round(paintingTransform.opacity * 100)}%</span>
          </div>

          <div style={{ color: 'white', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
            Scale: {scaleDisplay}
          </div>

          <button
            onClick={handleReset}
            style={{
              background: 'rgba(255,255,255,0.9)',
              color: '#333',
              border: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>

          <button
            onClick={handleDone}
            style={{
              background: 'rgba(76,175,80,0.9)',
              color: 'white',
              border: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
