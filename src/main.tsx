import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppProvider } from './context/AppContext';
import { DocumentScanner } from "./document-scanner";
import { OpenCVDocumentDetectHandler } from "./dynamsoft-document-viewer-handler";

// Export helpers for window access (keep backward compatibility)
(window as any)["DocumentScanner"] = DocumentScanner;
(window as any)["OpenCVDocumentDetectHandler"] = OpenCVDocumentDetectHandler;

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
}
