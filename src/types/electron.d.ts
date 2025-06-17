declare global {
  interface Window {
    electronAPI: {
      getSources: () => Promise<Array<{
        id: string;
        name: string;
        thumbnail: string;
      }>>;
      createRecordingFolder: () => Promise<{
        recordingId: string;
        recordingDir: string;
      }>;
      saveRecording: (data: {
        recordingId: string;
        type: 'screen' | 'webcam';
        buffer: ArrayBuffer;
      }) => Promise<string>;
      showFolder: (folderPath: string) => Promise<void>;
      renameRecordingFolder: (data: {
        oldPath: string;
        newName: string;
        recordingId: string;
      }) => Promise<{
        newPath: string;
        newFolderName: string;
      }>;
    };
  }
}
