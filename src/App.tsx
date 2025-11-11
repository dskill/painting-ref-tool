import React, { useEffect, useRef, useState } from 'react';
import { useOpenCV } from './hooks/useOpenCV';
import { useAppContext } from './context/AppContext';
import { FullscreenViewer } from './components/FullscreenViewer';
import { CameraViewer, CapturedImageData } from './camera-viewer';
import type { Point } from './context/AppContext';

export function App() {
  const { isReady: opencvReady, documentScanner } = useOpenCV();
  const {
    isLoading,
    setHasReference,
    setHasPainting,
    setReferenceImageData,
    setPaintingImageData,
    capturedPaintingData,
    setCapturedPaintingData,
    referenceImageData,
    enableCanny,
    setEnableCanny,
    flashEnabled,
    setFlashEnabled,
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

  // Process captured painting data: crop from original based on current aspect ratio
  const processCapturedPainting = async (originalImageData: string, cornerPoints: Point[]): Promise<string> => {
    if (!documentScanner) return originalImageData;

    // Wait for image to load
    const tempImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = originalImageData;
    });
    
    // Calculate output dimensions based on project aspect ratio
    // Use high resolution (2400px minimum width) for quality
    const aspectRatio = projectAspectWidth / projectAspectHeight;
    const detectedWidth = Math.max(
      documentScanner.distance(cornerPoints[0], cornerPoints[1]),
      documentScanner.distance(cornerPoints[2], cornerPoints[3])
    );
    const outputWidth = Math.max(2400, Math.round(detectedWidth));
    const outputHeight = Math.round(outputWidth / aspectRatio);

    // Create temp canvas from loaded image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tempImg.width;
    tempCanvas.height = tempImg.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(tempImg, 0, 0);

    // Crop with current aspect ratio
    const croppedCanvas = documentScanner.crop(tempCanvas, cornerPoints, outputWidth, outputHeight);
    return croppedCanvas.toDataURL();
  };

  // When aspect ratio changes, reprocess the captured painting if it exists
  useEffect(() => {
    if (capturedPaintingData && documentScanner) {
      (async () => {
        const processed = await processCapturedPainting(
          capturedPaintingData.originalImageData,
          capturedPaintingData.cornerPoints
        );
        setPaintingImageData(processed);
        
        // Recalculate scale for new dimensions
        if (savedPaintingTransform && referenceImageData) {
          const refImg = new Image();
          const paintImg = new Image();
          let loadCount = 0;

          function bothLoaded() {
            loadCount++;
            if (loadCount === 2) {
              const scaleX = refImg.width / paintImg.width;
              const scaleY = refImg.height / paintImg.height;
              const initialScale = (scaleX + scaleY) / 2;
              
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
          paintImg.src = processed;
        }
      })();
    }
  }, [projectAspectWidth, projectAspectHeight]);

  // Handle captured image from camera
  const handleCapturedImage = async (data: CapturedImageData) => {
    // Store the original uncropped image and corner points
    const originalDataURL = data.originalCanvas.toDataURL();
    setCapturedPaintingData({
      originalImageData: originalDataURL,
      cornerPoints: data.cornerPoints
    });

    // Process and crop based on current aspect ratio (async to avoid blocking)
    const processed = await processCapturedPainting(originalDataURL, data.cornerPoints);
    setPaintingImageData(processed);
    setHasPainting(true);

    // Calculate initial scale for alignment
    if (referenceImageData) {
      const refImg = new Image();
      const paintImg = new Image();
      let loadCount = 0;

      function bothLoaded() {
        loadCount++;
        if (loadCount === 2) {
          // Calculate scale to make painting same size as reference
          const scaleX = refImg.width / paintImg.width;
          const scaleY = refImg.height / paintImg.height;
          const initialScale = (scaleX + scaleY) / 2;
          
          // Apply saved transform if exists, otherwise start fresh
          if (savedPaintingTransform) {
            setPaintingTransform({
              scale: initialScale,
              rotation: savedPaintingTransform.rotation,
              offsetX: savedPaintingTransform.offsetXRatio * refImg.width,
              offsetY: savedPaintingTransform.offsetYRatio * refImg.height,
              opacity: paintingTransform.opacity
            });
          } else {
            setPaintingTransform({
              scale: initialScale,
              rotation: 0,
              offsetX: 0,
              offsetY: 0,
              opacity: 0.5
            });
          }
        }
      }

      refImg.onload = bothLoaded;
      paintImg.onload = bothLoaded;
      refImg.src = referenceImageData;
      paintImg.src = processed;
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
        flashEnabled,
        projectAspectWidth,
        projectAspectHeight,
        onCaptured: async (data) => {
          setShowCaptureViewer(false);
          await handleCapturedImage(data);
        },
        onEdgeModeToggle: (useCanny) => {
          setEnableCanny(useCanny);
        },
        onFlashToggle: (enabled) => {
          setFlashEnabled(enabled);
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
