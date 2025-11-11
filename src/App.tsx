import React, { useEffect, useRef, useState } from 'react';
import { useOpenCV } from './hooks/useOpenCV';
import { useAppContext } from './context/AppContext';
import { FullscreenViewer } from './components/FullscreenViewer';
import { CameraViewer } from './camera-viewer';

export function App() {
  const { isReady: opencvReady, documentScanner } = useOpenCV();
  const {
    isLoading,
    setHasReference,
    setHasPainting,
    setReferenceImageData,
    setPaintingImageData,
    enableCanny,
    savedPaintingTransform,
    paintingTransform,
    setPaintingTransform,
    setProjectAspectWidth,
    setProjectAspectHeight,
    projectAspectWidth,
    projectAspectHeight
  } = useAppContext();

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

    // Calculate output dimensions based on project aspect ratio
    // The aspect ratio is stored as a normalized fraction (e.g., 1:1.25, 16:9, etc.)
    // We use the detected width as the base and calculate height from the aspect ratio
    const aspectRatio = projectAspectWidth / projectAspectHeight;
    const detectedWidth = Math.max(
      documentScanner.distance(points[0], points[1]),
      documentScanner.distance(points[2], points[3])
    );
    const outputWidth = Math.round(detectedWidth);
    const outputHeight = Math.round(outputWidth / aspectRatio);

    const canvas = documentScanner.crop(img, points, outputWidth, outputHeight);
    const dataURL = canvas.toDataURL();

    setPaintingImageData(dataURL);
    setHasPainting(true);

    // Restore saved transform if it exists
    // The saved transform needs to be adjusted for the new painting's dimensions
    if (savedPaintingTransform && referenceImageData) {
      const refImg = new Image();
      const paintImg = new Image();
      let loadCount = 0;

      function bothLoaded() {
        loadCount++;
        if (loadCount === 2) {
          // Recalculate scale based on new painting dimensions
          const scaleX = refImg.width / paintImg.width;
          const scaleY = refImg.height / paintImg.height;
          const initialScale = (scaleX + scaleY) / 2;
          
          // Apply saved rotation and offsets (offsets are ratios relative to reference)
          setPaintingTransform({
            scale: initialScale,
            rotation: savedPaintingTransform.rotation,
            offsetX: savedPaintingTransform.offsetXRatio * refImg.width,
            offsetY: savedPaintingTransform.offsetYRatio * refImg.height,
            opacity: paintingTransform.opacity
          });
        }
      }

      refImg.onload = bothLoaded;
      paintImg.onload = bothLoaded;
      refImg.src = referenceImageData;
      paintImg.src = dataURL;
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
        // Initialize project aspect ratio to match reference image (normalized)
        // Calculate GCD to get simplified ratio
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(img.width, img.height);
        const normalizedWidth = img.width / divisor;
        const normalizedHeight = img.height / divisor;
        
        // If the ratio is still very large, normalize to base of 1
        if (normalizedWidth > 100 || normalizedHeight > 100) {
          setProjectAspectWidth(1);
          setProjectAspectHeight(img.height / img.width);
        } else {
          setProjectAspectWidth(normalizedWidth);
          setProjectAspectHeight(normalizedHeight);
        }
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
        projectAspectWidth,
        projectAspectHeight,
        onCaptured: (croppedCanvas) => {
          const dataURL = croppedCanvas.toDataURL();
          setPaintingImageData(dataURL);
          setHasPainting(true);
          setShowCaptureViewer(false);

          // Restore saved transform if it exists
          // The saved transform needs to be adjusted for the new painting's dimensions
          if (savedPaintingTransform && referenceImageData) {
            const refImg = new Image();
            const newPaintImg = new Image();
            let loadCount = 0;

            function bothLoaded() {
              loadCount++;
              if (loadCount === 2) {
                // Recalculate scale based on new painting dimensions
                const scaleX = refImg.width / newPaintImg.width;
                const scaleY = refImg.height / newPaintImg.height;
                const initialScale = (scaleX + scaleY) / 2;
                
                // Apply saved rotation and offsets (offsets are ratios relative to reference)
                setPaintingTransform({
                  scale: initialScale,
                  rotation: savedPaintingTransform.rotation,
                  offsetX: savedPaintingTransform.offsetXRatio * refImg.width,
                  offsetY: savedPaintingTransform.offsetYRatio * refImg.height,
                  opacity: paintingTransform.opacity
                });
              }
            }

            refImg.onload = bothLoaded;
            newPaintImg.onload = bothLoaded;
            refImg.src = referenceImageData;
            newPaintImg.src = dataURL;
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

  // Show loading screen while restoring saved state
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen viewer */}
      {!showCaptureViewer && (
        <FullscreenViewer
          onUploadReference={handleUploadReference}
          onLiveMode={handleLiveMode}
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
    </>
  );
}
