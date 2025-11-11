import React, { useRef } from 'react';
import { clearAppState } from '../utils/storage';

interface ToolbarProps {
  onUploadReference: (file: File) => void;
  onLiveMode: () => void;
  onAlign: () => void;
  onClearAll: () => void;
  isReady: boolean;
}

export function Toolbar({
  onUploadReference,
  onLiveMode,
  onAlign,
  onClearAll,
  isReady
}: ToolbarProps) {
  const referenceFileRef = useRef<HTMLInputElement>(null);

  const handleReferenceClick = () => {
    referenceFileRef.current?.click();
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadReference(file);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleClearAll = async () => {
    if (confirm('Clear all saved data and reload? This will remove reference image, art image, and all settings.')) {
      try {
        await clearAppState();
        onClearAll();
      } catch (error) {
        console.error('Failed to clear data:', error);
        alert('Failed to clear data. Try refreshing the page.');
      }
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

      <button
        disabled={!isReady}
        onClick={handleReferenceClick}
        style={{
          background: 'rgba(0,0,0,0.4)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.6)',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          fontSize: '1.06rem',
          cursor: isReady ? 'pointer' : 'not-allowed',
          opacity: isReady ? 1 : 0.5
        }}
      >
        Reference
      </button>

      <button
        disabled={!isReady}
        onClick={onLiveMode}
        style={{
          background: 'rgba(0,0,0,0.4)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.6)',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          fontSize: '1.06rem',
          cursor: isReady ? 'pointer' : 'not-allowed',
          opacity: isReady ? 1 : 0.5
        }}
      >
        Canvas
      </button>

      <button
        onClick={onAlign}
        style={{
          background: 'rgba(0,0,0,0.4)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.6)',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          fontSize: '1.06rem',
          cursor: 'pointer'
        }}
      >
        Align
      </button>

      <button
        onClick={handleClearAll}
        style={{
          background: 'rgba(139,0,0,0.6)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.6)',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          fontSize: '1.06rem',
          cursor: 'pointer'
        }}
      >
        Clear
      </button>
    </div>
  );
}
