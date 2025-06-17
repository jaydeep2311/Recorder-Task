import React from 'react';
import type { ScreenSource } from '../types';

interface ScreenSelectorProps {
  sources: ScreenSource[];
  selectedSource: ScreenSource | null;
  loading: boolean;
  error: string | null;
  onSourceSelect: (source: ScreenSource) => void;
  onRefresh: () => void;
}

export const ScreenSelector: React.FC<ScreenSelectorProps> = ({
  sources,
  selectedSource,
  loading,
  error,
  onSourceSelect,
  onRefresh,
}) => {
  return (
    <div className="screen-selector">
      <div className="screen-selector-header">
        <h3>Select Screen/Window to Record</h3>
        <button 
          onClick={onRefresh} 
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="sources-grid">
        {sources.map((source) => (
          <div
            key={source.id}
            className={`source-item ${selectedSource?.id === source.id ? 'selected' : ''}`}
            onClick={() => onSourceSelect(source)}
          >
            <img 
              src={source.thumbnail} 
              alt={source.name}
              className="source-thumbnail"
            />
            <div className="source-name">{source.name}</div>
          </div>
        ))}
      </div>
      
      {sources.length === 0 && !loading && (
        <div className="no-sources">
          No screens or windows found. Click refresh to try again.
        </div>
      )}
    </div>
  );
};
