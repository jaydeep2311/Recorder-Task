import { app, BrowserWindow, ipcMain, desktopCapturer, shell } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 300, height: 200 }
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('Error getting sources:', error);
    throw error;
  }
});

ipcMain.handle('create-recording-folder', async () => {
  try {
    const recordingId = uuidv4();
    const videosDir = join(process.cwd(), 'videos');
    const recordingDir = join(videosDir, recordingId);
    
    await fs.mkdir(videosDir, { recursive: true });
    await fs.mkdir(recordingDir, { recursive: true });
    
    return { recordingId, recordingDir };
  } catch (error) {
    console.error('Error creating recording folder:', error);
    throw error;
  }
});

ipcMain.handle('save-recording', async (_, { recordingId, type, buffer }) => {
  try {
    const videosDir = join(process.cwd(), 'videos');
    const recordingDir = join(videosDir, recordingId);
    const filename = `${type}.webm`;
    const filepath = join(recordingDir, filename);

    const nodeBuffer = Buffer.from(buffer);
    await fs.writeFile(filepath, nodeBuffer);
    return filepath;
  } catch (error) {
    console.error('Error saving recording:', error);
    throw error;
  }
});

ipcMain.handle('show-folder', async (_, folderPath) => {
  try {
    await shell.openPath(folderPath);
  } catch (error) {
    console.error('Error opening folder:', error);
    throw error;
  }
});

ipcMain.handle('rename-recording-folder', async (_, { oldPath, newName, recordingId }) => {
  try {
    const videosDir = join(process.cwd(), 'videos');
    const sanitizedName = newName.replace(/[<>:"/\\|?*]/g, '_'); // Sanitize filename
    const newFolderName = `${sanitizedName}_${recordingId}`;
    const newPath = join(videosDir, newFolderName);

    // Rename the folder
    await fs.rename(oldPath, newPath);

    return { newPath, newFolderName };
  } catch (error) {
    console.error('Error renaming recording folder:', error);
    throw error;
  }
});
