"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const fs_1 = require("fs");
const uuid_1 = require("uuid");
const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, 'preload.cjs'),
        },
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// IPC handlers
electron_1.ipcMain.handle('get-sources', async () => {
    try {
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['window', 'screen'],
            thumbnailSize: { width: 300, height: 200 }
        });
        return sources.map(source => ({
            id: source.id,
            name: source.name,
            thumbnail: source.thumbnail.toDataURL()
        }));
    }
    catch (error) {
        console.error('Error getting sources:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('create-recording-folder', async () => {
    try {
        const recordingId = (0, uuid_1.v4)();
        const videosDir = (0, path_1.join)(process.cwd(), 'videos');
        const recordingDir = (0, path_1.join)(videosDir, recordingId);
        await fs_1.promises.mkdir(videosDir, { recursive: true });
        await fs_1.promises.mkdir(recordingDir, { recursive: true });
        return { recordingId, recordingDir };
    }
    catch (error) {
        console.error('Error creating recording folder:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('save-recording', async (_, { recordingId, type, buffer }) => {
    try {
        const videosDir = (0, path_1.join)(process.cwd(), 'videos');
        const recordingDir = (0, path_1.join)(videosDir, recordingId);
        const filename = `${type}.webm`;
        const filepath = (0, path_1.join)(recordingDir, filename);
        const nodeBuffer = Buffer.from(buffer);
        await fs_1.promises.writeFile(filepath, nodeBuffer);
        return filepath;
    }
    catch (error) {
        console.error('Error saving recording:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('show-folder', async (_, folderPath) => {
    try {
        await electron_1.shell.openPath(folderPath);
    }
    catch (error) {
        console.error('Error opening folder:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('rename-recording-folder', async (_, { oldPath, newName, recordingId }) => {
    try {
        const videosDir = (0, path_1.join)(process.cwd(), 'videos');
        const sanitizedName = newName.replace(/[<>:"/\\|?*]/g, '_'); // Sanitize filename
        const newFolderName = `${sanitizedName}_${recordingId}`;
        const newPath = (0, path_1.join)(videosDir, newFolderName);
        // Rename the folder
        await fs_1.promises.rename(oldPath, newPath);
        return { newPath, newFolderName };
    }
    catch (error) {
        console.error('Error renaming recording folder:', error);
        throw error;
    }
});
