// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI: {
      openDirectory: () => Promise<string | null>;
      openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
      openExternal: (url: string) => Promise<void>;
      openInEditor: (filePath: string, line?: number) => Promise<{ success: boolean; fallback?: boolean }>;
      getPath: (name: string) => Promise<string>;
      platform: NodeJS.Platform;
      arch: string;
    };
  }
}

export const electronAPI = window.electronAPI;

export const isElectron = !!window.electronAPI;

export async function openDirectory(): Promise<string | null> {
  if (!isElectron) return null;
  return electronAPI.openDirectory();
}

export async function openFile(options?: { filters?: { name: string; extensions: string[] }[] }): Promise<string | null> {
  if (!isElectron) return null;
  return electronAPI.openFile(options);
}

export async function openExternal(url: string): Promise<void> {
  if (isElectron) {
    await electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}

export function getPlatform(): NodeJS.Platform {
  return isElectron ? electronAPI.platform : 'darwin';
}

export async function openInEditor(filePath: string, line?: number): Promise<void> {
  if (isElectron) {
    await electronAPI.openInEditor(filePath, line);
  }
}
