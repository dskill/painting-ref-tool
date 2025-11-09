import { useEffect, useState } from 'react';
import { DocumentScanner } from '../document-scanner';

export function useOpenCV() {
  const [isReady, setIsReady] = useState(false);
  const [documentScanner, setDocumentScanner] = useState<DocumentScanner | null>(null);

  useEffect(() => {
    // Set up the Module callback before opencv.js loads
    (window as any).Module = {
      onRuntimeInitialized: () => {
        const scanner = new DocumentScanner();
        setDocumentScanner(scanner);
        setIsReady(true);
      }
    };

    // If opencv.js has already loaded, call the callback
    if ((window as any).cv) {
      (window as any).Module.onRuntimeInitialized();
    }
  }, []);

  return { isReady, documentScanner };
}
