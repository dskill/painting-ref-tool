# Artists' Reference Alignment Tool

## Purpose
Mobile web app for artists to compare in-progress paintings with reference photos. Press/hold anywhere to toggle between reference and painting.

## Key Context

### Architecture Decision: Custom Camera Viewer
- Originally used Dynamsoft Document Viewer (commercial, licensed)
- Replaced with custom `CameraViewer` class (~350 lines) to avoid licensing
- Kept `DocumentScanner` class (OpenCV wrapper) from original project
- Core detection algorithm unchanged, only UI layer replaced

### Critical Components
- `src/camera-viewer.ts` - Live camera with real-time border detection overlay (60fps render, 15-20fps detection)
- `src/document-scanner.ts` - OpenCV wrapper, unchanged from opencvjs-document-scanner
- `src/components/FullscreenViewer.tsx` - Comparison view, pre-generates transformed painting for instant toggle
- `src/context/AppContext.tsx` - Global state: images, transforms, settings

### UI Design Constraints
- Mobile-first: buttons positioned above Safari address bar (110px bottom padding)
- Minimal retro style: `rgba(0,0,0,0.4)` backgrounds, white borders, white text
- All buttons same width (105px min-width) for symmetry
- Flash button inverts colors when active (no text change)

### Performance Patterns
- Camera detection: downscale to 720px, process, scale results back
- Comparison toggle: transformed painting pre-generated in useEffect (dependency: `[savedPaintingTransform, referenceImageData, paintingImageData]`)
- Detection runs every 60ms (~17fps), rendering uses requestAnimationFrame (60fps)

### Important Files
- `public/opencv.js` - Required for DocumentScanner, 10MB WebAssembly
- Button order (camera): Edge/Fill | Capture | Flash
- Button order (toolbar): Reference | Art | Align

### State Management
- Transform stored as ratios (offsetXRatio, offsetYRatio) to work across different image sizes
- `enableCanny` toggles Canny edge detection vs standard grayscale
- Painting image auto-cropped using detected borders on capture

## Tech Stack
React 19, TypeScript, Vite, OpenCV.js, Canvas API, deployed to GitHub Pages
