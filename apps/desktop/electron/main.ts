import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { execFile } from 'child_process';
import { initDatabase, closeDatabase } from '@repo-polisher/db';
import { createIPCHandler } from 'electron-trpc/main';
import { appRouter } from './ipc/router';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'RepoPolisher',
    // 使用默认标题栏
    // titleBarStyle: 'hiddenInset',
    // trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Initialize database
  const userDataPath = app.getPath('userData');
  initDatabase(userDataPath);

  // Create tRPC handler
  createIPCHandler({ router: appRouter, windows: [mainWindow] });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for native dialogs
ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:openFile', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    ...options,
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle('app:getPath', (_event, name: string) => {
  return app.getPath(name as any);
});

// Open file in VS Code
ipcMain.handle('editor:openFile', async (_event, filePath: string, line?: number) => {
  const args = line ? [`--goto`, `${filePath}:${line}`] : [filePath];

  // Try VS Code first, then fall back to system default
  const editors = process.platform === 'darwin'
    ? ['code', '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code']
    : process.platform === 'win32'
    ? ['code.cmd', 'code']
    : ['code'];

  // Helper function to try opening with an editor
  const tryOpenWithEditor = (editor: string): Promise<boolean> => {
    return new Promise((resolve) => {
      execFile(editor, args, { windowsHide: true }, (error) => {
        resolve(!error);
      });
    });
  };

  for (const editor of editors) {
    const success = await tryOpenWithEditor(editor);
    if (success) {
      return { success: true };
    }
  }

  // Fall back to opening with system default
  await shell.openPath(filePath);
  return { success: true, fallback: true };
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
