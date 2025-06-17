import React from 'react';

interface WebcamConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  onCancel: () => void;
}

export const WebcamConfirmModal: React.FC<WebcamConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onDecline,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Enable Webcam Recording?</h3>
        </div>
        
        <div className="modal-body">
          <p>Do you want to record your webcam along with the screen?</p>
          <div className="webcam-options">
            <div className="option-item">
              <span className="option-icon">📹</span>
              <span>Record screen + webcam</span>
            </div>
            <div className="option-item">
              <span className="option-icon">🖥️</span>
              <span>Record screen only</span>
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            onClick={onCancel}
            className="modal-btn cancel-btn"
          >
            Cancel
          </button>
          <button 
            onClick={onDecline}
            className="modal-btn decline-btn"
          >
            Screen Only
          </button>
          <button 
            onClick={onConfirm}
            className="modal-btn confirm-btn"
          >
            Screen + Webcam
          </button>
        </div>
      </div>
    </div>
  );
};
