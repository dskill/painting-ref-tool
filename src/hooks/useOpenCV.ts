import { useEffect, useState } from 'react';
import { DocumentScanner } from '../document-scanner';
import { OpenCVDocumentDetectHandler } from '../dynamsoft-document-viewer-handler';

export function useOpenCV() {
  const [isReady, setIsReady] = useState(false);
  const [documentScanner, setDocumentScanner] = useState<DocumentScanner | null>(null);
  const [detectHandler, setDetectHandler] = useState<OpenCVDocumentDetectHandler | null>(null);

  useEffect(() => {
    // Set up the Module callback before opencv.js loads
    (window as any).Module = {
      onRuntimeInitialized: () => {
        const scanner = new DocumentScanner();
        const handler = new OpenCVDocumentDetectHandler(scanner);

        // Set the custom detect handler for Dynamsoft
        if ((window as any).Dynamsoft?.DDV) {
          (window as any).Dynamsoft.DDV.setProcessingHandler('documentBoundariesDetect', handler);
        }

        setDocumentScanner(scanner);
        setDetectHandler(handler);
        setIsReady(true);
      }
    };

    // If opencv.js has already loaded, call the callback
    if ((window as any).cv) {
      (window as any).Module.onRuntimeInitialized();
    }
  }, []);

  return { isReady, documentScanner, detectHandler };
}
