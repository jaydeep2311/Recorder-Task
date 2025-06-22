import { useState, useCallback } from 'react';
import type { ScreenSource } from '../types';

export const useScreenCapture = () => {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<ScreenSource | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.electronAPI) {
        throw new Error('Electron API not available. Please run this app in Electron.');
      }

      const sources = await window.electronAPI.getSources();
      setSources(sources);
    } catch (err) {
      setError('Failed to get screen sources. Make sure you\'re running the Electron app.');
      console.error('Error getting sources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSource = useCallback(async (source: ScreenSource) => {
    try {
      setError(null);
      setSelectedSource(source);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron specific constraint
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          }
        }
      });
      
      setScreenStream(stream);
    } catch (err) {
      setError('Failed to capture screen');
      console.error('Error capturing screen:', err);
    }
  }, []);

  const stopScreenCapture = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setSelectedSource(null);
  }, [screenStream]);

  return {
    sources,
    selectedSource,
    screenStream,
    loading,
    error,
    getSources,
    selectSource,
    stopScreenCapture,
  };
};
