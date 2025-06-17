"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    getSources: () => electron_1.ipcRenderer.invoke('get-sources'),
    createRecordingFolder: () => electron_1.ipcRenderer.invoke('create-recording-folder'),
    saveRecording: (data) => electron_1.ipcRenderer.invoke('save-recording', data),
    showFolder: (folderPath) => electron_1.ipcRenderer.invoke('show-folder', folderPath),
    renameRecordingFolder: (data) => electron_1.ipcRenderer.invoke('rename-recording-folder', data),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
