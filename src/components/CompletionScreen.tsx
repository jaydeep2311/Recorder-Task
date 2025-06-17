import React, { useState } from 'react';
import type { RecordingSession } from '../types';

interface CompletionScreenProps {
  session: RecordingSession;
  onNewRecording: () => void;
  onOpenFolder: () => void;
  onRenameSession: (newName: string) => Promise<void>;
  formatDuration: (duration: number) => string;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  session,
  onNewRecording,
  onOpenFolder,
  onRenameSession,
  formatDuration,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(session.customName || '');
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = async () => {
    if (!newName.trim()) return;

    try {
      setIsRenaming(true);
      await onRenameSession(newName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to rename session:', error);
      alert('Failed to rename session. Please try again.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleCancelEdit = () => {
    setNewName(session.customName || '');
    setIsEditing(false);
  };
  return (
    <div className="completion-screen">
      <div className="completion-content">
        <div className="success-icon">✅</div>
        <h2>Recording Complete!</h2>
        
        <div className="session-info">
          <div className="info-item session-name-item">
            <strong>Session Name:</strong>
            {isEditing ? (
              <div className="name-edit-container">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="name-input"
                  placeholder="Enter session name"
                  disabled={isRenaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                />
                <div className="name-edit-actions">
                  <button
                    onClick={handleRename}
                    disabled={isRenaming || !newName.trim()}
                    className="save-name-btn"
                  >
                    {isRenaming ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isRenaming}
                    className="cancel-name-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="name-display-container">
                <span className="session-name">
                  {session.customName || 'Untitled Recording'}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-name-btn"
                  title="Rename session"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
          <div className="info-item">
            <strong>Duration:</strong> {formatDuration(session.duration)}
          </div>
          <div className="info-item">
            <strong>Started:</strong> {session.startTime.toLocaleString()}
          </div>
          <div className="info-item">
            <strong>Session ID:</strong> {session.recordingId}
          </div>
        </div>
        
        <div className="completion-actions">
          <button 
            onClick={onOpenFolder}
            className="open-folder-btn"
          >
            Open Folder
          </button>
          <button 
            onClick={onNewRecording}
            className="new-recording-btn"
          >
            New Recording
          </button>
        </div>
      </div>
    </div>
  );
};
