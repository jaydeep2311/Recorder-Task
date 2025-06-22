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

  // Function to create combined stream with webcam in bottom-left corner
  const createCombinedStream = useCallback((screenStream: MediaStream, webcamStream: MediaStream): MediaStream => {
    // Create canvas for combining streams
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Set fixed canvas size for better performance and seekability
    canvas.width = 1920;
    canvas.height = 1080;

    // Create video elements
    const screenVideo = document.createElement('video');
    const webcamVideo = document.createElement('video');

    // Configure video elements for better performance
    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.autoplay = true;

    webcamVideo.srcObject = webcamStream;
    webcamVideo.muted = true;
    webcamVideo.playsInline = true;
    webcamVideo.autoplay = true;

    // Store references
    canvasRef.current = canvas;
    contextRef.current = context;

    // Improved drawing loop with better performance
    const draw = () => {
      if (!context || !canvas) return;

      try {
        // Clear canvas with black background
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw screen video (full size) if ready
        if (screenVideo.readyState >= 2 && screenVideo.videoWidth > 0) {
          context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        }

        // Draw webcam video (bottom-left corner, 1/4 size) if ready
        if (webcamVideo.readyState >= 2 && webcamVideo.videoWidth > 0) {
          const webcamWidth = canvas.width / 4;
          const webcamHeight = canvas.height / 4;
          const webcamX = 20;
          const webcamY = canvas.height - webcamHeight - 20;

          // Draw white border for webcam
          context.fillStyle = '#ffffff';
          context.fillRect(webcamX - 3, webcamY - 3, webcamWidth + 6, webcamHeight + 6);

          // Draw webcam video
          context.drawImage(webcamVideo, webcamX, webcamY, webcamWidth, webcamHeight);
        }
      } catch (error) {
        console.error('Canvas drawing error:', error);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    // Start drawing immediately
    draw();

    // Create stream from canvas with better settings for seekability
    const combinedStream = canvas.captureStream(25); // 25 FPS for better performance

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

      // Reset chunk arrays
      screenChunksRef.current = [];
      webcamChunksRef.current = [];
      combinedChunksRef.current = [];

      // Get microphone stream for all recordings (completely muted for live playback)
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

        // Create a muted audio context to prevent any live audio playback
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(microphoneStream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Completely mute live audio
        source.connect(gainNode);

        // Ensure no audio plays through speakers
        microphoneStream.getAudioTracks().forEach(track => {
          track.enabled = true; // Keep enabled for recording but mute output
        });

        console.log('Microphone stream obtained for recording (completely muted for live playback)');
      } catch (error) {
        console.error('Failed to get microphone:', error);
      }

      // Start screen recording with microphone audio
      if (screenStream) {
        let finalScreenStream = screenStream;

        // Add microphone audio to screen stream
        if (microphoneStream) {
          finalScreenStream = new MediaStream();
          // Add video tracks from screen
          screenStream.getVideoTracks().forEach(track => {
            finalScreenStream.addTrack(track);
          });
          // Add audio tracks from microphone (enabled for recording only)
          microphoneStream.getAudioTracks().forEach(track => {
            const clonedTrack = track.clone();
            clonedTrack.enabled = true; // Enable for recording
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

      // Start webcam recording with microphone audio
      if (webcamStream) {
        let finalWebcamStream = webcamStream;

        // Add microphone audio to webcam stream
        if (microphoneStream) {
          finalWebcamStream = new MediaStream();
          // Add video tracks from webcam
          webcamStream.getVideoTracks().forEach(track => {
            finalWebcamStream.addTrack(track);
          });
          // Add audio tracks from microphone
          microphoneStream.getAudioTracks().forEach(track => {
            const clonedTrack = track.clone();
            clonedTrack.enabled = true; // Enable for recording
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

      // Start combined recording (screen + webcam in corner) with microphone
      if (screenStream && webcamStream) {
        const combinedStream = createCombinedStream(screenStream, webcamStream);

        // Add microphone audio to combined stream
        if (microphoneStream) {
          microphoneStream.getAudioTracks().forEach(track => {
            const clonedTrack = track.clone();
            clonedTrack.enabled = true; // Enable for recording
            combinedStream.addTrack(clonedTrack);
          });
        }

        // Use better codec settings for seekable video
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }
        }

        const combinedRecorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
          audioBitsPerSecond: 128000   // 128 kbps for audio
        });

        combinedRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            combinedChunksRef.current.push(event.data);
          }
        };

        combinedRecorderRef.current = combinedRecorder;
        combinedRecorder.start(1000); // Generate chunks every second for better seekability
        console.log('Combined recording started with microphone and better codec');
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
  }, [createCombinedStream]);

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
      
      // Stop screen recorder
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

      // Stop webcam recorder
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

      // Stop combined recorder
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
