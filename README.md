# Watercolor Painting Alignment Reference Tool

A web-based tool that helps artists compare their watercolor paintings with reference photos during the artistic process. Uses OpenCV.js for automatic border detection and perspective correction, with an interactive fullscreen comparison mode.

**[Try it now](https://dskill.github.io/painting-ref-tool/)**

> This project was started from [opencvjs-document-scanner](https://github.com/tony-xlh/opencvjs-document-scanner) but has been completely transformed for artist reference alignment workflows.

## Features

- **Dual Image Workflows**: Upload separate reference photo and painting photo
- **Automatic Border Detection**: Uses OpenCV.js to detect rectangular borders (pencil sketches) on both images
- **Perspective Correction**: Automatically deskews and crops detected painting borders
- **Interactive Fullscreen Comparison**:
  - Press/hold to toggle between reference and painting
  - Fine-tune alignment with rotation, scale, and position controls
  - Adjust opacity to blend/compare images
- **Live Camera Capture**: Use device camera to photograph your painting with real-time border detection
- **Mobile Optimized**: Touch gestures for pan, pinch-to-zoom, and image comparison
- **Persistent Alignment**: Saves transform settings when switching between different paintings

## How It Works

1. **Upload a reference photo** - The image you're using as inspiration
2. **Upload or capture a painting photo** - Your work-in-progress painting
3. **Automatic detection** - The app detects borders and applies perspective correction
4. **Fullscreen comparison** - Press/hold anywhere to toggle between reference and painting
5. **Fine-tune alignment** - Adjust rotation, scale, and position to perfectly overlay images

## Technology Stack

- **OpenCV.js** - Computer vision for border detection and perspective transformation
- **Dynamsoft Document Viewer** - Camera capture and live document detection UI
- **Vite** - Modern build tool and development server
- **TypeScript** - Type-safe application code

## Local Development

### Prerequisites

```bash
npm install
```

### Development Server

```bash
npm run dev
```

For HTTPS (required for camera access):

```bash
npm run dev:https
```

This requires `mkcert` to generate local SSL certificates. Install mkcert first:

```bash
# macOS
brew install mkcert
mkcert -install

# Then generate certificates
npm run cert
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

- `/src/document-scanner.ts` - Core OpenCV-based border detection and cropping logic
- `/src/dynamsoft-document-viewer-handler.ts` - Integration with Dynamsoft DDV for camera/live mode
- `/src/main.ts` - Module exports
- `/index.html` - Complete UI and application logic

## Border Detection Algorithm

The app uses OpenCV.js to automatically detect painting borders:

1. Convert image to grayscale (or use Canny edge detection for uneven lighting)
2. Apply Gaussian blur to reduce noise
3. Apply Otsu thresholding to binarize the image
4. Find all contours in the image
5. Select the largest contour (assumed to be the painting border)
6. Approximate contour to a 4-point polygon
7. Apply perspective transformation to get a deskewed rectangular image

You can toggle Canny edge detection for images with challenging lighting conditions.

## Deployment

The app is deployed to GitHub Pages via automated CI/CD:

```bash
npm run build
# Automated deployment via GitHub Actions
```

## Use Cases

- **Watercolor painting alignment** - Compare in-progress paintings with reference photos
- **Drawing accuracy checking** - Verify proportions and composition
- **Art instruction** - Demonstrate alignment techniques to students
- **Progress documentation** - Compare multiple stages of a painting

## Browser Support

Works in modern browsers with support for:
- Canvas API
- WebGL
- WebAssembly
- MediaDevices API (for camera capture)

Mobile-optimized for iOS and Android tablets and phones.

## License

MIT

## Credits

Originally based on [opencvjs-document-scanner](https://github.com/tony-xlh/opencvjs-document-scanner) by tony-xlh, transformed into a specialized painting reference alignment tool.
