import React, { useEffect, useRef, useState } from 'react';
import { useOpenCV } from './hooks/useOpenCV';
import { useAppContext } from './context/AppContext';
import { FullscreenViewer } from './components/FullscreenViewer';
import { CameraViewer } from './camera-viewer';

export function App() {
  const { isReady: opencvReady, documentScanner } = useOpenCV();
  const {
    setHasReference,
    setHasPainting,
    setReferenceImageData,
    setPaintingImageData,
    enableCanny,
    savedPaintingTransform,
    paintingTransform,
    setPaintingTransform
  } = useAppContext();

  const [showDebug, setShowDebug] = useState(false);
  const [showCaptureViewer, setShowCaptureViewer] = useState(false);
  const captureViewerRef = useRef<HTMLDivElement>(null);
  const cameraViewerRef = useRef<CameraViewer | null>(null);
  const isReady = opencvReady;

  // Cleanup camera viewer on unmount
  useEffect(() => {
    return () => {
      if (cameraViewerRef.current) {
        cameraViewerRef.current.destroy();
        cameraViewerRef.current = null;
      }
    };
  }, []);

  // Process and crop painting image
  const processAndCropImage = (img: HTMLImageElement) => {
    if (!documentScanner) return;

    const options: any = {};
    if (enableCanny) {
      options.useCanny = true;
    }

    const points = documentScanner.detect(img, options);
    const canvas = documentScanner.crop(img, points);
    const dataURL = canvas.toDataURL();

    setPaintingImageData(dataURL);
    setHasPainting(true);

    // Restore saved transform if it exists
    if (savedPaintingTransform) {
      const refImg = new Image();
      refImg.onload = () => {
        setPaintingTransform({
          scale: savedPaintingTransform.scale,
          rotation: savedPaintingTransform.rotation,
          offsetX: savedPaintingTransform.offsetXRatio * refImg.width,
          offsetY: savedPaintingTransform.offsetYRatio * refImg.height,
          opacity: paintingTransform.opacity
        });
      };
      if (img.src) {
        refImg.src = img.src;
      }
    }
  };

  const handleUploadReference = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        setReferenceImageData(result);
        setHasReference(true);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPainting = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        processAndCropImage(img);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleLiveMode = async () => {
    if (!documentScanner || !captureViewerRef.current) return;

    try {
      // Clean up previous viewer if exists
      if (cameraViewerRef.current) {
        cameraViewerRef.current.destroy();
      }

      // Show capture viewer container
      setShowCaptureViewer(true);

      // Create and start new camera viewer
      const viewer = new CameraViewer({
        container: captureViewerRef.current,
        detectionInterval: 60, // ~17fps
        scanOptions: { useCanny: enableCanny },
        onCaptured: (croppedCanvas) => {
          const dataURL = croppedCanvas.toDataURL();
          setPaintingImageData(dataURL);
          setHasPainting(true);
          setShowCaptureViewer(false);

          // Restore saved transform if it exists
          if (savedPaintingTransform) {
            const refImg = new Image();
            refImg.onload = () => {
              setPaintingTransform({
                scale: savedPaintingTransform.scale,
                rotation: savedPaintingTransform.rotation,
                offsetX: savedPaintingTransform.offsetXRatio * refImg.width,
                offsetY: savedPaintingTransform.offsetYRatio * refImg.height,
                opacity: paintingTransform.opacity
              });
            };
            refImg.src = dataURL;
          }
        }
      });

      cameraViewerRef.current = viewer;
      await viewer.start();
    } catch (error) {
      console.error('Failed to start camera:', error);
      setShowCaptureViewer(false);
      alert('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const handleDebug = () => {
    setShowDebug(true);
  };

  return (
    <>
      {/* Fullscreen viewer */}
      {!showDebug && !showCaptureViewer && (
        <FullscreenViewer
          onUploadReference={handleUploadReference}
          onUploadPainting={handleUploadPainting}
          onLiveMode={handleLiveMode}
          onDebug={handleDebug}
          isReady={isReady}
        />
      )}

      {/* Capture viewer container */}
      <div
        ref={captureViewerRef}
        style={{
          display: showCaptureViewer ? 'block' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1000
        }}
      />

      {/* Debug view */}
      {showDebug && (
        <div style={{ padding: '2rem' }}>
          <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>Reference Tool - Debug View</h2>
          <div>
            <button
              onClick={() => setShowDebug(false)}
              style={{
                padding: '0.75rem 1.5rem',
                margin: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Back to Fullscreen
            </button>
            <button
              disabled={!isReady}
              onClick={() => document.getElementById('debugReferenceFile')?.click()}
              style={{
                padding: '0.75rem 1.5rem',
                margin: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: isReady ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : '#ccc',
                color: 'white',
                fontWeight: 600,
                cursor: isReady ? 'pointer' : 'not-allowed'
              }}
            >
              Upload Reference Photo
            </button>
            <button
              disabled={!isReady}
              onClick={() => document.getElementById('debugPaintingFile')?.click()}
              style={{
                padding: '0.75rem 1.5rem',
                margin: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: isReady ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : '#ccc',
                color: 'white',
                fontWeight: 600,
                cursor: isReady ? 'pointer' : 'not-allowed'
              }}
            >
              Upload Painting Photo
            </button>
            <button
              disabled={!isReady}
              onClick={handleLiveMode}
              style={{
                padding: '0.75rem 1.5rem',
                margin: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: isReady ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : '#ccc',
                color: 'white',
                fontWeight: 600,
                cursor: isReady ? 'pointer' : 'not-allowed'
              }}
            >
              Live Camera (Painting)
            </button>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={enableCanny}
                onChange={(e) => useAppContext().setEnableCanny(e.target.checked)}
              />
              Enable Canny Edge Detection
            </label>
          </div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0.5rem 0', fontSize: '1rem', color: '#666' }}>Reference Photo</h3>
              <img
                src={useAppContext().referenceImageData || ''}
                alt=""
                style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0.5rem 0', fontSize: '1rem', color: '#666' }}>Cropped Painting</h3>
              <img
                src={useAppContext().paintingImageData || ''}
                alt=""
                style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <input
            id="debugReferenceFile"
            type="file"
            accept=".jpg,.jpeg,.png,.bmp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadReference(file);
            }}
          />
          <input
            id="debugPaintingFile"
            type="file"
            accept=".jpg,.jpeg,.png,.bmp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadPainting(file);
            }}
          />
        </div>
      )}
    </>
  );
}
