import { useState, useCallback } from 'react';

export const useWebcamCapture = () => {
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWebcam = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      setWebcamStream(stream);
      setIsWebcamEnabled(true);
      return stream; 
    } catch (err) {
      setError('Failed to access webcam. Please check permissions.');
      console.error('Error accessing webcam:', err);
      throw err; 
    } finally {
      setLoading(false);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamEnabled(false);
  }, [webcamStream]);

  const toggleWebcam = useCallback(() => {
    if (isWebcamEnabled) {
      stopWebcam();
    } else {
      startWebcam();
    }
  }, [isWebcamEnabled, startWebcam, stopWebcam]);

  return {
    webcamStream,
    isWebcamEnabled,
    loading,
    error,
    startWebcam,
    stopWebcam,
    toggleWebcam,
  };
};
