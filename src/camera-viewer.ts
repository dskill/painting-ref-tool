import { DocumentScanner, Point } from './document-scanner';

export interface CapturedImageData {
  originalCanvas: HTMLCanvasElement;  // Full resolution uncropped image
  cornerPoints: Point[];               // Detected corner points
}

export interface CameraViewerOptions {
  container: HTMLElement;
  detectionInterval?: number; // ms between detection runs (default: 60ms for ~17fps)
  scanOptions?: { useCanny?: boolean };
  flashEnabled?: boolean;
  projectAspectWidth?: number;
  projectAspectHeight?: number;
  onCaptured?: (data: CapturedImageData) => void;
  onEdgeModeToggle?: (useCanny: boolean) => void;
  onFlashToggle?: (flashEnabled: boolean) => void;
}

export class CameraViewer {
  private container: HTMLElement;
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stream: MediaStream | null = null;
  private scanner: DocumentScanner;
  private detectionInterval: number;
  private scanOptions: { useCanny?: boolean };
  private projectAspectWidth?: number;
  private projectAspectHeight?: number;
  private onCaptured?: (data: CapturedImageData) => void;
  private onEdgeModeToggle?: (useCanny: boolean) => void;
  private onFlashToggle?: (flashEnabled: boolean) => void;

  private detectedPoints: Point[] | null = null;
  private detectionTimer: number | null = null;
  private renderAnimationId: number | null = null;
  private isCapturing: boolean = false;

  // UI elements
  private captureButton: HTMLButtonElement;
  private flashButton: HTMLButtonElement;
  private edgeModeButton: HTMLButtonElement;
  private flashEnabled: boolean = false;

  constructor(options: CameraViewerOptions) {
    this.container = options.container;
    this.detectionInterval = options.detectionInterval || 60; // ~17fps default
    this.scanOptions = options.scanOptions || { useCanny: true };
    this.flashEnabled = options.flashEnabled ?? false;
    this.projectAspectWidth = options.projectAspectWidth;
    this.projectAspectHeight = options.projectAspectHeight;
    this.onCaptured = options.onCaptured;
    this.onEdgeModeToggle = options.onEdgeModeToggle;
    this.onFlashToggle = options.onFlashToggle;
    this.scanner = new DocumentScanner();

    // Create video element (hidden)
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', 'true'); // Important for iOS
    this.video.style.display = 'none';

    // Create canvas for rendering
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.objectFit = 'contain';
    this.ctx = this.canvas.getContext('2d')!;

    // Create UI controls
    this.captureButton = this.createCaptureButton();
    this.flashButton = this.createFlashButton();
    this.edgeModeButton = this.createEdgeModeButton();

    // Build UI
    this.buildUI();
  }

  private buildUI(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.backgroundColor = '#000';

    // Canvas (fills entire container)
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    // Controls container - positioned at bottom, above Safari UI
    const controls = document.createElement('div');
    controls.style.position = 'absolute';
    controls.style.bottom = '0';
    controls.style.left = '50%';
    controls.style.transform = 'translateX(-50%)';
    controls.style.display = 'flex';
    controls.style.justifyContent = 'center';
    controls.style.alignItems = 'center';
    controls.style.gap = '0.25rem';
    controls.style.padding = '0.5rem';
    controls.style.paddingBottom = 'max(110px, calc(env(safe-area-inset-bottom) + 90px))';
    controls.style.zIndex = '10';

    controls.appendChild(this.edgeModeButton);
    controls.appendChild(this.captureButton);
    controls.appendChild(this.flashButton);

    this.container.appendChild(this.canvas);
    this.container.appendChild(controls);
    this.container.appendChild(this.video);
  }

  private createCaptureButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = 'Capture';
    button.style.cssText = `
      background: rgba(0,0,0,0.4);
      color: white;
      border: 1px solid rgba(255,255,255,0.6);
      padding: 0.625rem 1.25rem;
      border-radius: 4px;
      font-size: 1.125rem;
      cursor: pointer;
      min-width: 105px;
    `;

    button.addEventListener('click', () => this.capture());

    return button;
  }

  private createFlashButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = 'Flash';
    button.style.cssText = `
      background: ${this.flashEnabled ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.4)'};
      color: ${this.flashEnabled ? '#333' : 'white'};
      border: 1px solid rgba(255,255,255,0.6);
      padding: 0.625rem 1.25rem;
      border-radius: 4px;
      font-size: 1.125rem;
      cursor: pointer;
      min-width: 105px;
    `;

    button.addEventListener('click', () => this.toggleFlash());

    return button;
  }

  private createEdgeModeButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = this.scanOptions.useCanny ? 'Edge' : 'Fill';
    button.style.cssText = `
      background: rgba(0,0,0,0.4);
      color: white;
      border: 1px solid rgba(255,255,255,0.6);
      padding: 0.625rem 1.25rem;
      border-radius: 4px;
      font-size: 1.125rem;
      cursor: pointer;
      min-width: 105px;
    `;

    button.addEventListener('click', () => this.toggleEdgeMode());

    return button;
  }

  private toggleEdgeMode(): void {
    this.scanOptions.useCanny = !this.scanOptions.useCanny;
    this.edgeModeButton.textContent = this.scanOptions.useCanny ? 'Edge' : 'Fill';
    // Notify parent so the setting persists
    if (this.onEdgeModeToggle) {
      this.onEdgeModeToggle(this.scanOptions.useCanny);
    }
  }

  async start(): Promise<void> {
    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      this.video.srcObject = this.stream;
      await this.video.play();

      // Set canvas size to match video
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;

      // Start detection loop
      this.startDetection();

      // Start render loop
      this.startRendering();

    } catch (error) {
      console.error('Failed to start camera:', error);
      throw error;
    }
  }

  private startDetection(): void {
    const runDetection = () => {
      if (!this.isCapturing && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        try {
          // Create temporary canvas for detection
          const detectionCanvas = document.createElement('canvas');

          // Downscale for performance (similar to OpenCVDocumentDetectHandler)
          const maxDimension = 720;
          const scale = Math.min(1, maxDimension / Math.max(this.video.videoWidth, this.video.videoHeight));

          detectionCanvas.width = this.video.videoWidth * scale;
          detectionCanvas.height = this.video.videoHeight * scale;

          const detectionCtx = detectionCanvas.getContext('2d')!;
          detectionCtx.drawImage(this.video, 0, 0, detectionCanvas.width, detectionCanvas.height);

          // Run detection
          const points = this.scanner.detect(detectionCanvas, this.scanOptions);

          // Scale points back to original resolution
          if (points && points.length === 4) {
            this.detectedPoints = points.map(p => ({
              x: p.x / scale,
              y: p.y / scale
            }));
          } else {
            this.detectedPoints = null;
          }
        } catch (error) {
          console.error('Detection error:', error);
          this.detectedPoints = null;
        }
      }
    };

    // Run detection at specified interval
    this.detectionTimer = window.setInterval(runDetection, this.detectionInterval);
  }

  private startRendering(): void {
    const render = () => {
      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        // Draw video frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Draw overlay if document detected
        if (this.detectedPoints && this.detectedPoints.length === 4) {
          this.drawOverlay(this.detectedPoints);
        }
      }

      this.renderAnimationId = requestAnimationFrame(render);
    };

    render();
  }

  private drawOverlay(points: Point[]): void {
    const ctx = this.ctx;

    // Draw detected boundary polygon
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.lineTo(points[3].x, points[3].y);
    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur = 0; // Reset shadow

    // Draw corner markers
    ctx.fillStyle = '#00ff00';
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Add corner labels
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), point.x, point.y);
      ctx.fillStyle = '#00ff00';
    });
  }

  private async toggleFlash(): Promise<void> {
    if (!this.stream) return;

    const track = this.stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;

    if (!capabilities.torch) {
      alert('Flash not supported on this device');
      return;
    }

    try {
      this.flashEnabled = !this.flashEnabled;
      await track.applyConstraints({
        advanced: [{ torch: this.flashEnabled } as any]
      });

      // Update button styling to show flash state
      this.flashButton.style.background = this.flashEnabled ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.4)';
      this.flashButton.style.color = this.flashEnabled ? '#333' : 'white';

      // Notify parent so the setting persists
      if (this.onFlashToggle) {
        this.onFlashToggle(this.flashEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle flash:', error);
      alert('Failed to toggle flash');
    }
  }

  private capture(): void {
    if (!this.video || this.isCapturing) return;

    this.isCapturing = true;

    try {
      // Create canvas with current video frame (full resolution, uncropped)
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = this.video.videoWidth;
      captureCanvas.height = this.video.videoHeight;

      const captureCtx = captureCanvas.getContext('2d')!;
      captureCtx.drawImage(this.video, 0, 0);

      // Detect corner points - use already detected points if available
      // Otherwise, downscale for detection (same as preview) to avoid hanging on high-res images
      let points: Point[];
      if (this.detectedPoints) {
        points = this.detectedPoints;
      } else {
        // Downscale for detection performance
        const maxDimension = 720;
        const scale = Math.min(1, maxDimension / Math.max(this.video.videoWidth, this.video.videoHeight));
        
        const detectionCanvas = document.createElement('canvas');
        detectionCanvas.width = this.video.videoWidth * scale;
        detectionCanvas.height = this.video.videoHeight * scale;
        
        const detectionCtx = detectionCanvas.getContext('2d')!;
        detectionCtx.drawImage(this.video, 0, 0, detectionCanvas.width, detectionCanvas.height);
        
        const detectedPoints = this.scanner.detect(detectionCanvas, this.scanOptions);
        
        // Scale points back to original resolution
        points = detectedPoints.map(p => ({
          x: p.x / scale,
          y: p.y / scale
        }));
      }

      // Stop camera
      this.stop();

      // Callback with original canvas and corner points
      // The cropping will be done later based on current aspect ratio settings
      if (this.onCaptured) {
        this.onCaptured({
          originalCanvas: captureCanvas,
          cornerPoints: points
        });
      }
    } catch (error) {
      console.error('Capture error:', error);
      this.isCapturing = false;
    }
  }

  stop(): void {
    // Stop detection
    if (this.detectionTimer !== null) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = null;
    }

    // Stop rendering
    if (this.renderAnimationId !== null) {
      cancelAnimationFrame(this.renderAnimationId);
      this.renderAnimationId = null;
    }

    // Stop camera stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear video
    this.video.srcObject = null;

    // Reset state
    this.detectedPoints = null;
    this.isCapturing = false;
    this.flashEnabled = false;
  }

  destroy(): void {
    this.stop();
    this.container.innerHTML = '';
  }
}
