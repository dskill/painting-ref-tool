import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { saveAppState, loadAppState, requestPersistentStorage } from '../utils/storage';

export interface PaintingTransform {
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface SavedPaintingTransform {
  scale: number;
  rotation: number;
  offsetXRatio: number;
  offsetYRatio: number;
}

interface AppContextType {
  hasReference: boolean;
  setHasReference: (value: boolean) => void;
  hasPainting: boolean;
  setHasPainting: (value: boolean) => void;
  referenceImageData: string | null;
  setReferenceImageData: (value: string | null) => void;
  paintingImageData: string | null;
  setPaintingImageData: (value: string | null) => void;
  alignmentMode: boolean;
  setAlignmentMode: (value: boolean) => void;
  paintingTransform: PaintingTransform;
  setPaintingTransform: (value: PaintingTransform) => void;
  savedPaintingTransform: SavedPaintingTransform | null;
  setSavedPaintingTransform: (value: SavedPaintingTransform | null) => void;
  enableCanny: boolean;
  setEnableCanny: (value: boolean) => void;
  projectAspectWidth: number;
  setProjectAspectWidth: (value: number) => void;
  projectAspectHeight: number;
  setProjectAspectHeight: (value: number) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasReference, setHasReference] = useState(false);
  const [hasPainting, setHasPainting] = useState(false);
  const [referenceImageData, setReferenceImageData] = useState<string | null>(null);
  const [paintingImageData, setPaintingImageData] = useState<string | null>(null);
  const [alignmentMode, setAlignmentMode] = useState(false);
  const [enableCanny, setEnableCanny] = useState(true);
  const [projectAspectWidth, setProjectAspectWidth] = useState(1920);
  const [projectAspectHeight, setProjectAspectHeight] = useState(1080);
  const [paintingTransform, setPaintingTransform] = useState<PaintingTransform>({
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    opacity: 0.5
  });
  const [savedPaintingTransform, setSavedPaintingTransform] = useState<SavedPaintingTransform | null>(null);

  // Load saved state on initialization
  useEffect(() => {
    async function loadSavedState() {
      try {
        // Request persistent storage (important for Safari)
        await requestPersistentStorage();

        // Load saved state from IndexedDB
        const savedState = await loadAppState();

        if (savedState) {
          if (savedState.referenceImageData) {
            setReferenceImageData(savedState.referenceImageData);
            setHasReference(true);
          }
          if (savedState.paintingImageData) {
            setPaintingImageData(savedState.paintingImageData);
            setHasPainting(true);
          }
          if (savedState.savedPaintingTransform) {
            setSavedPaintingTransform(savedState.savedPaintingTransform);
          }
          setEnableCanny(savedState.enableCanny);
          setProjectAspectWidth(savedState.projectAspectWidth);
          setProjectAspectHeight(savedState.projectAspectHeight);
        }
      } catch (error) {
        console.error('Failed to load saved state:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSavedState();
  }, []);

  // Auto-save state changes
  useEffect(() => {
    // Don't save during initial load
    if (isLoading) return;

    async function save() {
      try {
        await saveAppState(
          referenceImageData,
          paintingImageData,
          savedPaintingTransform,
          enableCanny,
          projectAspectWidth,
          projectAspectHeight
        );
      } catch (error) {
        console.error('Failed to save state:', error);
        // Handle QuotaExceededError gracefully
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded. Consider clearing old data.');
        }
      }
    }

    save();
  }, [referenceImageData, paintingImageData, savedPaintingTransform, enableCanny, projectAspectWidth, projectAspectHeight, isLoading]);

  return (
    <AppContext.Provider
      value={{
        hasReference,
        setHasReference,
        hasPainting,
        setHasPainting,
        referenceImageData,
        setReferenceImageData,
        paintingImageData,
        setPaintingImageData,
        alignmentMode,
        setAlignmentMode,
        paintingTransform,
        setPaintingTransform,
        savedPaintingTransform,
        setSavedPaintingTransform,
        enableCanny,
        setEnableCanny,
        projectAspectWidth,
        setProjectAspectWidth,
        projectAspectHeight,
        setProjectAspectHeight,
        isLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
