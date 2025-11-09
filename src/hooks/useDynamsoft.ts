import { useEffect, useState } from 'react';

export function useDynamsoft() {
  const [isReady, setIsReady] = useState(false);
  const [docManager, setDocManager] = useState<any>(null);
  const [doc, setDoc] = useState<any>(null);
  const [captureViewer, setCaptureViewer] = useState<any>(null);

  useEffect(() => {
    async function initDDV() {
      const Dynamsoft = (window as any).Dynamsoft;

      if (!Dynamsoft?.DDV) {
        console.error('Dynamsoft DDV not loaded');
        return;
      }

      try {
        // Set license key
        Dynamsoft.DDV.Core.license = "DLS2eyJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSJ9";

        // Use relative path to work with any base URL
        Dynamsoft.DDV.Core.engineResourcePath = "./dynamsoft-document-viewer/engine";

        await Dynamsoft.DDV.Core.loadWasm();
        await Dynamsoft.DDV.Core.init();

        const manager = Dynamsoft.DDV.documentManager;
        const document = manager.createDocument({ name: "doc" });

        setDocManager(manager);
        setDoc(document);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize Dynamsoft DDV:', error);
      }
    }

    initDDV();
  }, []);

  return { isReady, docManager, doc, captureViewer, setCaptureViewer };
}
