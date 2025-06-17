import React, { useEffect, useRef } from 'react';

interface WebcamPreviewProps {
  stream: MediaStream | null;
  isEnabled: boolean;
  loading: boolean;
  error: string | null;
  onToggle: () => void;
}

export const WebcamPreview: React.FC<WebcamPreviewProps> = ({
  stream,
  isEnabled,
  loading,
  error,
  onToggle,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="webcam-preview">
      <div className="webcam-header">
        <h3>Webcam</h3>
        <button 
          onClick={onToggle}
          disabled={loading}
          className={`toggle-btn ${isEnabled ? 'enabled' : 'disabled'}`}
        >
          {loading ? 'Loading...' : isEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="webcam-container">
        {isEnabled && stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            className="webcam-video"
          />
        ) : (
          <div className="webcam-placeholder">
            {isEnabled ? 'Starting webcam...' : 'Webcam disabled'}
          </div>
        )}
      </div>
    </div>
  );
};
