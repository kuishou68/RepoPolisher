import { contextBridge, ipcRenderer } from 'electron';
import { exposeElectronTRPC } from 'electron-trpc/main';

// Expose tRPC
process.once('loaded', async () => {
  exposeElectronTRPC();
});

// Expose additional APIs
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:openFile', options),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Editor
  openInEditor: (filePath: string, line?: number) =>
    ipcRenderer.invoke('editor:openFile', filePath, line),

  // App
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),

  // Platform info
  platform: process.platform,
  arch: process.arch,
});
