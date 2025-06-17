import { useState, useCallback, useRef } from 'react';
import type { RecordingSession } from '../types';

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const webcamChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async (
    screenStream: MediaStream | null,
    webcamStream: MediaStream | null
  ) => {
    try {
      setError(null);

      if (!window.electronAPI) {
        throw new Error('Electron API not available. Please run this app in Electron.');
      }

      console.log('Starting recording with streams:', {
        screenStream: !!screenStream,
        webcamStream: !!webcamStream,
        screenTracks: screenStream?.getTracks().length || 0,
        webcamTracks: webcamStream?.getTracks().length || 0
      });

      const { recordingId, recordingDir } = await window.electronAPI.createRecordingFolder();
      
      const session: RecordingSession = {
        recordingId,
        recordingDir,
        startTime: new Date(),
        duration: 0,
      };
      
      setCurrentSession(session);
      
      screenChunksRef.current = [];
      webcamChunksRef.current = [];
      
      if (screenStream) {
        const screenRecorder = new MediaRecorder(screenStream, {
          mimeType: 'video/webm;codecs=vp9'
        });
        
        screenRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            screenChunksRef.current.push(event.data);
          }
        };
        
        screenRecorderRef.current = screenRecorder;
        screenRecorder.start(1000); // Collect data every second
      }
      
      // Start webcam recording if available
      if (webcamStream) {
        console.log('Starting webcam recording with stream:', webcamStream);
        const webcamRecorder = new MediaRecorder(webcamStream, {
          mimeType: 'video/webm;codecs=vp9'
        });

        webcamRecorder.ondataavailable = (event) => {
          console.log('Webcam data available:', event.data.size);
          if (event.data.size > 0) {
            webcamChunksRef.current.push(event.data);
          }
        };

        webcamRecorderRef.current = webcamRecorder;
        webcamRecorder.start(1000);
        console.log('Webcam recorder started');
      } else {
        console.log('No webcam stream available for recording');
      }
      
      timerRef.current = setInterval(() => {
        setCurrentSession(prev => prev ? {
          ...prev,
          duration: Date.now() - prev.startTime.getTime()
        } : null);
      }, 1000);
      
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording');
      console.error('Error starting recording:', err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      setError(null);
      
      if (!currentSession) return;
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop recorders
      const promises: Promise<void>[] = [];
      
      if (screenRecorderRef.current) {
        promises.push(new Promise((resolve) => {
          screenRecorderRef.current!.onstop = async () => {
            if (screenChunksRef.current.length > 0) {
              const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });
              const buffer = await blob.arrayBuffer();
              await window.electronAPI.saveRecording({
                recordingId: currentSession.recordingId,
                type: 'screen',
                buffer
              });
            }
            resolve();
          };
          screenRecorderRef.current!.stop();
        }));
      }
      
      if (webcamRecorderRef.current) {
        console.log('Stopping webcam recorder, chunks:', webcamChunksRef.current.length);
        promises.push(new Promise((resolve) => {
          webcamRecorderRef.current!.onstop = async () => {
            console.log('Webcam recorder stopped, saving chunks:', webcamChunksRef.current.length);
            if (webcamChunksRef.current.length > 0) {
              const blob = new Blob(webcamChunksRef.current, { type: 'video/webm' });
              const buffer = await blob.arrayBuffer();
              console.log('Saving webcam recording, buffer size:', buffer.byteLength);
              await window.electronAPI.saveRecording({
                recordingId: currentSession.recordingId,
                type: 'webcam',
                buffer
              });
              console.log('Webcam recording saved successfully');
            } else {
              console.log('No webcam chunks to save');
            }
            resolve();
          };
          webcamRecorderRef.current!.stop();
        }));
      } else {
        console.log('No webcam recorder to stop');
      }
      
      await Promise.all(promises);

      screenRecorderRef.current = null;
      webcamRecorderRef.current = null;
      screenChunksRef.current = [];
      webcamChunksRef.current = [];

      setIsRecording(false);

      return currentSession;
    } catch (err) {
      setError('Failed to stop recording');
      console.error('Error stopping recording:', err);
      setIsRecording(false);
    }
  }, [currentSession]);

  const formatDuration = useCallback((duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    currentSession,
    error,
    startRecording,
    stopRecording,
    formatDuration,
  };
};
