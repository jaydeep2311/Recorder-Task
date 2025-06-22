import React, { useEffect, useState } from 'react';
import { useScreenCapture } from './hooks/useScreenCapture';
import { useWebcamCapture } from './hooks/useWebcamCapture';
import { useRecording } from './hooks/useRecording';
import type { RecordingSession } from './types';
import { ScreenSelector } from './components/ScreenSelector';
import { RecordingControls } from './components/RecordingControls';
import { CompletionScreen } from './components/CompletionScreen';
import { WebcamConfirmModal } from './components/WebcamConfirmModal';
import './App.css';

function App() {
  const [completedSession, setCompletedSession] = useState<RecordingSession | null>(null);
  const [showWebcamModal, setShowWebcamModal] = useState(false);

  const {
    sources,
    selectedSource,
    screenStream,
    loading: screenLoading,
    error: screenError,
    getSources,
    selectSource,
    stopScreenCapture,
  } = useScreenCapture();

  const {
    webcamStream,
    isWebcamEnabled,
    startWebcam,
    stopWebcam,
  } = useWebcamCapture();

  const {
    isRecording,
    currentSession,
    error: recordingError,
    startRecording,
    stopRecording,
    formatDuration,
  } = useRecording();

  useEffect(() => {
    getSources();
  }, [getSources]);

  const handleStartRecording = () => {
    setShowWebcamModal(true);
  };

  const handleWebcamConfirm = async () => {
    setShowWebcamModal(false);
    try {
      const webcamStreamResult = await startWebcam();
      await startRecording(screenStream, webcamStreamResult);
    } catch (error) {
      console.error('Failed to start webcam:', error);
      await startRecording(screenStream, null);
    }
  };

  const handleWebcamDecline = async () => {
    setShowWebcamModal(false);
    stopWebcam();
    await startRecording(screenStream, null);
  };

  const handleModalCancel = () => {
    setShowWebcamModal(false);
  };

  const handleStopRecording = async () => {
    const session = await stopRecording();
    stopWebcam();
    if (session) {
      setCompletedSession(session);
    }
  };

  const handleNewRecording = () => {
    setCompletedSession(null);
    stopScreenCapture();
    stopWebcam();
  };

  const handleOpenFolder = async () => {
    if (completedSession) {
      await window.electronAPI.showFolder(completedSession.recordingDir);
    }
  };

  const handleRenameSession = async (newName: string) => {
    if (!completedSession) return;

    try {
      const { newPath } = await window.electronAPI.renameRecordingFolder({
        oldPath: completedSession.recordingDir,
        newName,
        recordingId: completedSession.recordingId
      });

      // Update the session with new name and path
      setCompletedSession({
        ...completedSession,
        customName: newName,
        recordingDir: newPath
      });
    } catch (error) {
      console.error('Failed to rename session:', error);
      throw error;
    }
  };

  const canRecord = selectedSource !== null;

  if (completedSession) {
    return (
      <CompletionScreen
        session={completedSession}
        onNewRecording={handleNewRecording}
        onOpenFolder={handleOpenFolder}
        onRenameSession={handleRenameSession}
        formatDuration={formatDuration}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Screen & Webcam Recorder</h1>
        <p>Record your screen and webcam simultaneously</p>
        {!window.electronAPI && (
          <div className="warning-banner">
            ⚠️ Running in browser mode. Please use Electron for full functionality.
          </div>
        )}
      </header>

      <main className="app-main">
        <div className="recording-setup">
          <ScreenSelector
            sources={sources}
            selectedSource={selectedSource}
            loading={screenLoading}
            error={screenError}
            onSourceSelect={selectSource}
            onRefresh={getSources}
          />
        </div>

        <RecordingControls
          isRecording={isRecording}
          currentSession={currentSession}
          canRecord={canRecord}
          error={recordingError}
          isWebcamEnabled={isWebcamEnabled}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          formatDuration={formatDuration}
        />

      </main>

      <WebcamConfirmModal
        isOpen={showWebcamModal}
        onConfirm={handleWebcamConfirm}
        onDecline={handleWebcamDecline}
        onCancel={handleModalCancel}
      />
    </div>
  );
}

export default App;
