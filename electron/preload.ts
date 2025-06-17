import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
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
}

const electronAPI: ElectronAPI = {
  getSources: () => ipcRenderer.invoke('get-sources'),
  createRecordingFolder: () => ipcRenderer.invoke('create-recording-folder'),
  saveRecording: (data) => ipcRenderer.invoke('save-recording', data),
  showFolder: (folderPath) => ipcRenderer.invoke('show-folder', folderPath),
  renameRecordingFolder: (data) => ipcRenderer.invoke('rename-recording-folder', data),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
