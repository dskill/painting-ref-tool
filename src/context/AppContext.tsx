import React, { createContext, useContext, useState, ReactNode } from 'react';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hasReference, setHasReference] = useState(false);
  const [hasPainting, setHasPainting] = useState(false);
  const [referenceImageData, setReferenceImageData] = useState<string | null>(null);
  const [paintingImageData, setPaintingImageData] = useState<string | null>(null);
  const [alignmentMode, setAlignmentMode] = useState(false);
  const [enableCanny, setEnableCanny] = useState(true);
  const [paintingTransform, setPaintingTransform] = useState<PaintingTransform>({
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    opacity: 0.5
  });
  const [savedPaintingTransform, setSavedPaintingTransform] = useState<SavedPaintingTransform | null>(null);

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
        setEnableCanny
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
