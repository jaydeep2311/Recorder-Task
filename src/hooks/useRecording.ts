import { useState, useCallback, useRef } from 'react';
import type { RecordingSession } from '../types';

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const webcamChunksRef = useRef<Blob[]>([]);
  const combinedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationRef = useRef<number | null>(null);

  const createCombinedStream = useCallback((screenStream: MediaStream, webcamStream: MediaStream): MediaStream => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      powerPreference: 'high-performance'
    }) as CanvasRenderingContext2D;

    const screenTrack = screenStream.getVideoTracks()[0];
    const settings = screenTrack.getSettings();

    canvas.width = settings.width || 1920;
    canvas.height = settings.height || 1080;

    const screenVideo = document.createElement('video');
    const webcamVideo = document.createElement('video');

    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.autoplay = true;
    screenVideo.setAttribute('playsinline', 'true');

    webcamVideo.srcObject = webcamStream;
    webcamVideo.muted = true;
    webcamVideo.playsInline = true;
    webcamVideo.autoplay = true;
    webcamVideo.setAttribute('playsinline', 'true');

    canvasRef.current = canvas;
    contextRef.current = context;

    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const draw = (currentTime: number) => {
      if (!context || !canvas) return;

      if (currentTime - lastFrameTime < frameInterval) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = currentTime;

      try {
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (screenVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            screenVideo.videoWidth > 0 && screenVideo.videoHeight > 0) {
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        }

        if (webcamVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            webcamVideo.videoWidth > 0 && webcamVideo.videoHeight > 0) {

          const webcamSize = Math.min(canvas.width / 4, canvas.height / 4);
          const webcamWidth = webcamSize;
          const webcamHeight = webcamSize * (webcamVideo.videoHeight / webcamVideo.videoWidth);
          const webcamX = 20;
          const webcamY = canvas.height - webcamHeight - 20;

          context.fillStyle = '#ffffff';
          context.fillRect(webcamX - 2, webcamY - 2, webcamWidth + 4, webcamHeight + 4);

          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(webcamVideo, webcamX, webcamY, webcamWidth, webcamHeight);
        }
      } catch (error) {
        console.error('Canvas drawing error:', error);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    Promise.all([
      new Promise(resolve => {
        if (screenVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve(true);
        } else {
          screenVideo.addEventListener('loadeddata', () => resolve(true), { once: true });
        }
      }),
      new Promise(resolve => {
        if (webcamVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve(true);
        } else {
          webcamVideo.addEventListener('loadeddata', () => resolve(true), { once: true });
        }
      })
    ]).then(() => {
      console.log('Both video streams ready, starting canvas drawing');
      animationRef.current = requestAnimationFrame(draw);
    });

    const combinedStream = canvas.captureStream(30);

    return combinedStream;
  }, []);

  const createSeekableCombinedStream = useCallback((screenStream: MediaStream, webcamStream: MediaStream): MediaStream => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;

    canvas.width = 1920;
    canvas.height = 1080;

    const screenVideo = document.createElement('video');
    const webcamVideo = document.createElement('video');

    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.autoplay = true;

    webcamVideo.srcObject = webcamStream;
    webcamVideo.muted = true;
    webcamVideo.autoplay = true;

    const drawFrame = () => {
      if (!context) return;

      context.fillStyle = '#000000';
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (screenVideo.readyState >= 2) {
        context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      }

      if (webcamVideo.readyState >= 2) {
        const webcamWidth = 320; // Fixed size for consistency
        const webcamHeight = 240;
        const webcamX = 20;
        const webcamY = canvas.height - webcamHeight - 20;

        context.fillStyle = '#ffffff';
        context.fillRect(webcamX - 2, webcamY - 2, webcamWidth + 4, webcamHeight + 4);

        context.drawImage(webcamVideo, webcamX, webcamY, webcamWidth, webcamHeight);
      }

      setTimeout(drawFrame, 33); // ~30 FPS
    };

    setTimeout(drawFrame, 100);

    const combinedStream = canvas.captureStream(30);

    return combinedStream;
  }, []);

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
      combinedChunksRef.current = [];

      let microphoneStream: MediaStream | null = null;
      try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 2
          },
          video: false
        });

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(microphoneStream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; 
        source.connect(gainNode);

        microphoneStream.getAudioTracks().forEach(track => {
          track.enabled = true; 
        });

        console.log('Microphone stream obtained for recording (completely muted for live playback)');
      } catch (error) {
        console.error('Failed to get microphone:', error);
      }

      if (screenStream) {
        let finalScreenStream = screenStream;

        if (microphoneStream) {
          finalScreenStream = new MediaStream();
          screenStream.getVideoTracks().forEach(track => {
            finalScreenStream.addTrack(track);
          });
          microphoneStream.getAudioTracks().forEach(track => {
            const clonedTrack = track.clone();
            clonedTrack.enabled = true; 
            finalScreenStream.addTrack(clonedTrack);
          });
        }

        const screenRecorder = new MediaRecorder(finalScreenStream);

        screenRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            screenChunksRef.current.push(event.data);
          }
        };

        screenRecorderRef.current = screenRecorder;
        screenRecorder.start();
        console.log('Screen recording started with microphone');
      }

      if (webcamStream) {
        let finalWebcamStream = webcamStream;

        if (microphoneStream) {
          finalWebcamStream = new MediaStream();
          webcamStream.getVideoTracks().forEach(track => {
            finalWebcamStream.addTrack(track);
          });
          microphoneStream.getAudioTracks().forEach(track => {
            const clonedTrack = track.clone();
            clonedTrack.enabled = true; 
            finalWebcamStream.addTrack(clonedTrack);
          });
        }

        const webcamRecorder = new MediaRecorder(finalWebcamStream);

        webcamRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            webcamChunksRef.current.push(event.data);
          }
        };

        webcamRecorderRef.current = webcamRecorder;
        webcamRecorder.start();
        console.log('Webcam recording started with microphone');
      }

      if (screenStream && webcamStream) {
        const combinedStream = createSeekableCombinedStream(screenStream, webcamStream);

        if (microphoneStream) {
          microphoneStream.getAudioTracks().forEach(track => {
            const clonedTrack = track.clone();
            clonedTrack.enabled = true;
            combinedStream.addTrack(clonedTrack);
          });
        }

        const combinedRecorder = new MediaRecorder(combinedStream, {
          mimeType: 'video/webm',
          videoBitsPerSecond: 2000000, 
          audioBitsPerSecond: 128000
        });

        combinedRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            combinedChunksRef.current.push(event.data);
          }
        };

        combinedRecorderRef.current = combinedRecorder;
        combinedRecorder.start(); 
        console.log('Combined recording started with seekable approach');
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
  }, [createSeekableCombinedStream]);

  const stopRecording = useCallback(async () => {
    try {
      setError(null);
      
      if (!currentSession) return;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const promises: Promise<void>[] = [];
      
      if (screenRecorderRef.current) {
        promises.push(new Promise((resolve) => {
          screenRecorderRef.current!.onstop = async () => {
            // Save all collected chunks
            if (screenChunksRef.current.length > 0) {
              const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });
              const buffer = await blob.arrayBuffer();
              await window.electronAPI.saveRecording({
                recordingId: currentSession.recordingId,
                type: 'screen',
                buffer
              });
              console.log('Screen recording saved');
            }
            console.log('Screen recording stopped');
            resolve();
          };
          screenRecorderRef.current!.stop();
        }));
      }

      if (webcamRecorderRef.current) {
        promises.push(new Promise((resolve) => {
          webcamRecorderRef.current!.onstop = async () => {
            // Save all collected chunks
            if (webcamChunksRef.current.length > 0) {
              const blob = new Blob(webcamChunksRef.current, { type: 'video/webm' });
              const buffer = await blob.arrayBuffer();
              await window.electronAPI.saveRecording({
                recordingId: currentSession.recordingId,
                type: 'webcam',
                buffer
              });
              console.log('Webcam recording saved');
            }
            console.log('Webcam recording stopped');
            resolve();
          };
          webcamRecorderRef.current!.stop();
        }));
      }

      if (combinedRecorderRef.current) {
        promises.push(new Promise((resolve) => {
          combinedRecorderRef.current!.onstop = async () => {
            // Save all collected chunks
            if (combinedChunksRef.current.length > 0) {
              const blob = new Blob(combinedChunksRef.current, { type: 'video/webm' });
              const buffer = await blob.arrayBuffer();
              await window.electronAPI.saveRecording({
                recordingId: currentSession.recordingId,
                type: 'combined',
                buffer
              });
              console.log('Combined recording saved');
            }
            console.log('Combined recording stopped');
            resolve();
          };
          combinedRecorderRef.current!.stop();
        }));
      }
      
      await Promise.all(promises);

      // Stop animation loop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Clean up
      screenRecorderRef.current = null;
      webcamRecorderRef.current = null;
      combinedRecorderRef.current = null;
      screenChunksRef.current = [];
      webcamChunksRef.current = [];
      combinedChunksRef.current = [];
      canvasRef.current = null;
      contextRef.current = null;

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
