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
    if (!referenceImageData || !paintingImageData) return;

    const refImg = new Image();
    const paintImg = new Image();
    let loadCount = 0;

    function bothLoaded() {
      loadCount++;
      if (loadCount === 2) {
        if (savedPaintingTransform) {
          // Restore saved transform
          setPaintingTransform({
            scale: savedPaintingTransform.scale,
            rotation: savedPaintingTransform.rotation,
            offsetX: savedPaintingTransform.offsetXRatio * refImg.width,
            offsetY: savedPaintingTransform.offsetYRatio * refImg.height,
            opacity: paintingTransform.opacity
          });
          setScaleDisplay(Math.round(savedPaintingTransform.scale * 100) + '%');
        } else {
          // Calculate initial scale to normalize painting size to match reference
          // Both images should represent the same physical object, so scale based on their dimensions
          const scaleX = refImg.width / paintImg.width;
          const scaleY = refImg.height / paintImg.height;
          // Use the average scale to handle slight aspect ratio differences
          const initialScale = (scaleX + scaleY) / 2;
          
          setPaintingTransform({
            scale: initialScale,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            opacity: 0.5
          });
          setScaleDisplay(Math.round(initialScale * 100) + '%');
        }
      }
    }

    refImg.onload = bothLoaded;
    paintImg.onload = bothLoaded;
    refImg.src = referenceImageData;
    paintImg.src = paintingImageData;
  }, []);

  useEffect(() => {
    renderAlignmentView();
  }, [paintingTransform, referenceImageData, paintingImageData]);

  // Add keyboard shortcut: Escape to exit alignment mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDone();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onDone]);

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
    const newScale = Math.max(0.1, Math.min(10, paintingTransform.scale + delta));
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
      const newScale = Math.max(0.1, Math.min(10, (distance / pinchStart.distance) * pinchStart.scale));
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
    setSavedPaintingTransform(null);

    // Reset aspect ratio to match reference image (normalized) and calculate initial scale
    if (referenceImageData && paintingImageData) {
      const refImg = new Image();
      const paintImg = new Image();
      let loadCount = 0;

      function bothLoaded() {
        loadCount++;
        if (loadCount === 2) {
          // Calculate GCD to get simplified ratio
          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
          const divisor = gcd(refImg.width, refImg.height);
          const normalizedWidth = refImg.width / divisor;
          const normalizedHeight = refImg.height / divisor;
          
          // If the ratio is still very large, normalize to base of 1
          if (normalizedWidth > 100 || normalizedHeight > 100) {
            setProjectAspectWidth(1);
            setProjectAspectHeight(refImg.height / refImg.width);
          } else {
            setProjectAspectWidth(normalizedWidth);
            setProjectAspectHeight(normalizedHeight);
          }

          // Calculate initial scale to normalize painting size to match reference
          const scaleX = refImg.width / paintImg.width;
          const scaleY = refImg.height / paintImg.height;
          const initialScale = (scaleX + scaleY) / 2;
          
          setPaintingTransform({
            scale: initialScale,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            opacity: 0.5
          });
          setScaleDisplay(Math.round(initialScale * 100) + '%');
        }
      }

      refImg.onload = bothLoaded;
      paintImg.onload = bothLoaded;
      refImg.src = referenceImageData;
      paintImg.src = paintingImageData;
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

  // Calculate canvas display size based on reference image dimensions (not project aspect ratio)
  // The canvas always shows the reference image at its native aspect ratio
  // The project aspect ratio affects how captured images are cropped, not the display
  useEffect(() => {
    if (!referenceImageData || !canvasRef.current) return;

    const refImg = new Image();
    refImg.onload = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      // Use reference image's native aspect ratio for display
      const displayAspectRatio = refImg.width / refImg.height;

      // Reserve space for controls at the bottom (approximately 120px to account for wrapping)
      const controlsHeight = 120;
      const availableHeight = viewportHeight - controlsHeight;

      let displayWidth = viewportWidth * 0.95;
      let displayHeight = displayWidth / displayAspectRatio;

      if (displayHeight > availableHeight * 0.85) {
        displayHeight = availableHeight * 0.85;
        displayWidth = displayHeight * displayAspectRatio;
      }

      if (canvasRef.current) {
        canvasRef.current.style.width = displayWidth + 'px';
        canvasRef.current.style.height = displayHeight + 'px';
      }
    };
    refImg.src = referenceImageData;
  }, [referenceImageData]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'none',
          display: 'block'
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
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          zIndex: 1000,
          maxWidth: '95vw',
          pointerEvents: 'auto',
          maxHeight: '40vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ color: 'white', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Canvas</label>
            <input
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              value={projectAspectWidth}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || val === '0' || val === '0.') {
                  setProjectAspectWidth(0.01);
                } else {
                  setProjectAspectWidth(parseFloat(val) || 0.01);
                }
              }}
              onFocus={(e) => e.target.select()}
              style={{
                width: '60px',
                padding: '0.25rem',
                fontSize: '0.7rem',
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid #ccc',
                borderRadius: '3px'
              }}
            />
            <span style={{ color: 'white', fontSize: '0.7rem' }}>:</span>
            <input
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              value={projectAspectHeight}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || val === '0' || val === '0.') {
                  setProjectAspectHeight(0.01);
                } else {
                  setProjectAspectHeight(parseFloat(val) || 0.01);
                }
              }}
              onFocus={(e) => e.target.select()}
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
    </div>
  );
}
