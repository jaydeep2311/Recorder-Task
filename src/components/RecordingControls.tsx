import React from 'react';
import type { RecordingSession } from '../types';

interface RecordingControlsProps {
  isRecording: boolean;
  currentSession: RecordingSession | null;
  canRecord: boolean;
  error: string | null;
  isWebcamEnabled: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  formatDuration: (duration: number) => string;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  currentSession,
  canRecord,
  error,
  isWebcamEnabled,
  onStartRecording,
  onStopRecording,
  formatDuration,
}) => {
  return (
    <div className="recording-controls">
      <div className="recording-status">
        {isRecording && currentSession && (
          <div className="recording-info">
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              Recording
              {isWebcamEnabled && (
                <span className="webcam-indicator">📹</span>
              )}
            </div>
            <div className="recording-timer">
              {formatDuration(currentSession.duration)}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="control-buttons">
        {!isRecording ? (
          <button
            onClick={onStartRecording}
            disabled={!canRecord}
            className="start-btn"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={onStopRecording}
            className="stop-btn"
          >
            Stop Recording
          </button>
        )}
      </div>
      
      {!canRecord && !isRecording && (
        <div className="warning-message">
          Please select a screen/window to record
        </div>
      )}
    </div>
  );
};
