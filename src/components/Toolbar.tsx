import React, { useRef } from 'react';

interface ToolbarProps {
  onUploadReference: (file: File) => void;
  onUploadPainting: (file: File) => void;
  onLiveMode: () => void;
  onAlign: () => void;
  onDebug: () => void;
  isReady: boolean;
}

export function Toolbar({
  onUploadReference,
  onUploadPainting,
  onLiveMode,
  onAlign,
  onDebug,
  isReady
}: ToolbarProps) {
  const referenceFileRef = useRef<HTMLInputElement>(null);
  const paintingFileRef = useRef<HTMLInputElement>(null);

  const handleReferenceClick = () => {
    referenceFileRef.current?.click();
  };

  const handlePaintingClick = () => {
    paintingFileRef.current?.click();
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadReference(file);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handlePaintingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPainting(file);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.25rem',
        background: 'rgba(0,0,0,0.8)',
        padding: '0.5rem',
        borderRadius: '6px',
        zIndex: 10
      }}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <input
        ref={referenceFileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.bmp"
        style={{ display: 'none' }}
        onChange={handleReferenceChange}
      />
      <input
        ref={paintingFileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.bmp"
        style={{ display: 'none' }}
        onChange={handlePaintingChange}
      />

      <button
        disabled={!isReady}
        onClick={handleReferenceClick}
        style={{
          background: 'rgba(255,255,255,0.9)',
          color: '#333',
          border: 'none',
          padding: '0.4rem 0.7rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: isReady ? 'pointer' : 'not-allowed',
          opacity: isReady ? 1 : 0.5
        }}
      >
        Upload Ref
      </button>

      <button
        disabled={!isReady}
        onClick={handlePaintingClick}
        style={{
          background: 'rgba(255,255,255,0.9)',
          color: '#333',
          border: 'none',
          padding: '0.4rem 0.7rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: isReady ? 'pointer' : 'not-allowed',
          opacity: isReady ? 1 : 0.5
        }}
      >
        Upload Paint
      </button>

      <button
        disabled={!isReady}
        onClick={onLiveMode}
        style={{
          background: 'rgba(255,255,255,0.9)',
          color: '#333',
          border: 'none',
          padding: '0.4rem 0.7rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: isReady ? 'pointer' : 'not-allowed',
          opacity: isReady ? 1 : 0.5
        }}
      >
        Live
      </button>

      <button
        onClick={onAlign}
        style={{
          background: 'rgba(255,255,255,0.9)',
          color: '#333',
          border: 'none',
          padding: '0.4rem 0.7rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: 'pointer'
        }}
      >
        Align
      </button>

      <button
        onClick={onDebug}
        style={{
          background: 'rgba(255,255,255,0.9)',
          color: '#333',
          border: 'none',
          padding: '0.4rem 0.7rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: 'pointer'
        }}
      >
        Debug
      </button>
    </div>
  );
}
