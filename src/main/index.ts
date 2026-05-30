import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AttachmentService } from './services/attachmentService';
import { FileTreeService } from './services/fileTreeService';
import { GitService } from './services/gitService';
import { PreviewServerService } from './services/previewServerService';
import { QwenSessionService } from './services/qwenSessionService';
import { SessionStore } from './services/sessionStore';
import { SettingsStore } from './services/settingsStore';
import { WorkspaceCommandService } from './services/workspaceCommandService';
import { WorkspaceCheckpointService } from './services/workspaceCheckpointService';
import { WorkspaceFileService } from './services/workspaceFileService';
import { WorkspaceMemoryService } from './services/workspaceMemoryService';
import { formatSessionBackup, formatSettingsBackup, readSessionBackup, readSettingsBackup } from '../shared/backups';
import type {
  AppSettings,
  ChatEntry,
  ExportTranscriptRequest,
  ExportTranscriptResult,
  ImportSessionBackupResult,
  ImportSettingsBackupResult,
  PreviewStartRequest,
  QwenPermissionResponse,
  QwenRunRequest,
  RuntimeLogInfo,
  SaveApiKeyRequest,
  SessionBackupResult,
  SettingsBackupResult,
  WorkspaceInfo
} from '../shared/types';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

app.setName('Qwen Workshop');
app.setAppUserModelId('com.qwenworkshop.app');

const smokeMode = process.argv.includes('--qwen-workshop-smoke') || process.env.QWEN_WORKSHOP_SMOKE === '1';

if (smokeMode) {
  app.setPath('userData', join(tmpdir(), 'qwen-workshop-smoke'));
}

process.on('uncaughtException', (error) => {
  logRuntimeIssue('uncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
  logRuntimeIssue('unhandledRejection', reason);
});

const settingsStore = new SettingsStore();
const sessionStore = new SessionStore();
const attachmentService = new AttachmentService();
const fileTreeService = new FileTreeService();
const gitService = new GitService();
const workspaceCommandService = new WorkspaceCommandService();
const workspaceFileService = new WorkspaceFileService();
const workspaceMemoryService = new WorkspaceMemoryService();
const workspaceCheckpointService = new WorkspaceCheckpointService();
const previewServerService = new PreviewServerService();
const qwenSessionService = new QwenSessionService(settingsStore, workspaceMemoryService, workspaceCheckpointService);

let mainWindow: BrowserWindow | undefined;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    show: !smokeMode,
    backgroundColor: '#080808',
    icon: resolveAppIconPath(),
    title: 'Qwen Workshop',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logRuntimeIssue('render-process-gone', details);

    if (details.reason !== 'clean-exit' && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }, 500);
    }
  });

  mainWindow.webContents.on('unresponsive', () => {
    logRuntimeIssue('renderer-unresponsive', 'Renderer became unresponsive.');
  });

  if (smokeMode) {
    wireSmokeTest(mainWindow);
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function wireSmokeTest(window: BrowserWindow): void {
  let settled = false;

  const finish = (ok: boolean, message: string): void => {
    if (settled) {
      return;
    }

    settled = true;
    console.log(ok ? `QWEN_WORKSHOP_SMOKE_OK ${message}` : `QWEN_WORKSHOP_SMOKE_FAIL ${message}`);
    setTimeout(() => app.exit(ok ? 0 : 1), 50);
  };

  window.webContents.once('did-finish-load', () => {
    setTimeout(() => finish(true, 'renderer-loaded'), 250);
  });

  window.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
    finish(false, `${errorCode}: ${errorDescription}`);
  });

  setTimeout(() => finish(false, 'renderer-load-timeout'), 15000);
}

function resolveAppIconPath(): string {
  const packagedIconPath = join(process.resourcesPath, 'qwen-workshop-icon.png');
  const developmentIconPath = join(__dirname, '../../resources/qwen-workshop-icon.png');

  return existsSync(packagedIconPath) ? packagedIconPath : developmentIconPath;
}

function logRuntimeIssue(label: string, value: unknown): void {
  try {
    const logPath = join(app.getPath('userData'), 'runtime.log');
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `[${new Date().toISOString()}] ${label}\n${formatLogValue(value)}\n\n`, 'utf8');
  } catch {
    // Last-ditch logging must never become the reason the app exits.
  }
}

function formatLogValue(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack ?? ''}`.trim();
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  previewServerService.stopAll();
});

app.on('child-process-gone', (_event, details) => {
  logRuntimeIssue('child-process-gone', details);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function registerIpc(): void {
  ipcMain.handle('workspace:select', async (): Promise<WorkspaceInfo | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Open a Qwen Workshop workspace',
      properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const workspacePath = result.filePaths[0];
    return {
      name: workspacePath.split(/[\\/]/).at(-1) ?? 'Workspace',
      path: workspacePath
    };
  });

  ipcMain.handle('workspace:file-tree', (_event, workspacePath: string) => fileTreeService.load(workspacePath));
  ipcMain.handle('workspace:file-read', (_event, request) => workspaceFileService.read(request));
  ipcMain.handle('workspace:file-save', (_event, request) => workspaceFileService.save(request));
  ipcMain.handle('workspace:file-open-external', async (_event, request) => {
    const filePath = workspaceFileService.resolveFilePath(request);
    const error = await shell.openPath(filePath);

    if (error) {
      throw new Error(error);
    }
  });
  ipcMain.handle('workspace:search', (_event, request) => workspaceFileService.search(request));
  ipcMain.handle('workspace:memory-get', (_event, workspacePath: string) => workspaceMemoryService.get(workspacePath));
  ipcMain.handle('workspace:memory-save', (_event, request) => workspaceMemoryService.save(request));
  ipcMain.handle('workspace:checkpoints-list', (_event, workspacePath: string) =>
    workspaceCheckpointService.list(workspacePath)
  );
  ipcMain.handle('workspace:checkpoint-restore', (_event, request) => workspaceCheckpointService.restore(request));
  ipcMain.handle('workspace:git-status', (_event, workspacePath: string) => gitService.status(workspacePath));
  ipcMain.handle('workspace:git-diff', (_event, workspacePath: string) => gitService.diff(workspacePath));
  ipcMain.handle('workspace:checks', (_event, workspacePath: string) => workspaceCommandService.detectChecks(workspacePath));
  ipcMain.handle('workspace:run-command', (_event, request) => workspaceCommandService.run(request));
  ipcMain.handle('settings:get', () => settingsStore.getSettings());
  ipcMain.handle('settings:save', (_event, settings: AppSettings) => settingsStore.saveSettings(settings));
  ipcMain.handle('settings:export-backup', () => exportSettingsBackup());
  ipcMain.handle('settings:import-backup', () => importSettingsBackup());
  ipcMain.handle('runtime-log:get', () => readRuntimeLog());
  ipcMain.handle('runtime-log:clear', () => clearRuntimeLog());
  ipcMain.handle('runtime-log:open-external', () => openRuntimeLogExternal());
  ipcMain.handle('session:get', () => sessionStore.getSession());
  ipcMain.handle('session:save', (_event, session) => sessionStore.saveSession(session));
  ipcMain.handle('session:export-backup', () => exportSessionBackup());
  ipcMain.handle('session:import-backup', () => importSessionBackup());
  ipcMain.handle('session:export-transcript', (_event, request: ExportTranscriptRequest) =>
    exportTranscript(request)
  );
  ipcMain.handle('secrets:status', () => settingsStore.getSecretStatus());
  ipcMain.handle('secrets:save', (_event, request: SaveApiKeyRequest) => settingsStore.saveApiKey(request.kind, request.value));
  ipcMain.handle('attachments:import', (_event, request) => attachmentService.importAttachments(request));
  ipcMain.handle('qwen:test', (_event, request) => qwenSessionService.testConnection(request));
  ipcMain.handle('qwen:permission-response', (_event, response: QwenPermissionResponse) =>
    qwenSessionService.resolvePermission(response)
  );

  ipcMain.handle('qwen:start', (_event, request: QwenRunRequest) => {
    if (!mainWindow) {
      throw new Error('Main window is not ready.');
    }
    return qwenSessionService.start(mainWindow, request);
  });

  ipcMain.handle('qwen:interrupt', (_event, runId: string) => qwenSessionService.interrupt(runId));

  ipcMain.handle('preview:start', (_event, request: PreviewStartRequest) => {
    if (!mainWindow) {
      throw new Error('Main window is not ready.');
    }
    return previewServerService.start(mainWindow, request);
  });

  ipcMain.handle('preview:stop', (_event, previewId: string) => previewServerService.stop(previewId));
}

async function readRuntimeLog(): Promise<RuntimeLogInfo> {
  const logPath = runtimeLogPath();

  if (!existsSync(logPath)) {
    return {
      path: logPath,
      exists: false,
      content: ''
    };
  }

  const content = await readFile(logPath, 'utf8');

  return {
    path: logPath,
    exists: true,
    content: content.length > 120000 ? content.slice(content.length - 120000) : content,
    updatedAt: new Date().toISOString()
  };
}

async function clearRuntimeLog(): Promise<RuntimeLogInfo> {
  const logPath = runtimeLogPath();
  await mkdir(dirname(logPath), { recursive: true });
  await writeFile(logPath, '', 'utf8');
  return readRuntimeLog();
}

async function openRuntimeLogExternal(): Promise<void> {
  const logPath = runtimeLogPath();

  if (!existsSync(logPath)) {
    await clearRuntimeLog();
  }

  const error = await shell.openPath(logPath);

  if (error) {
    throw new Error(error);
  }
}

async function exportSettingsBackup(): Promise<SettingsBackupResult | null> {
  const defaultPath = join(app.getPath('documents'), `qwen-workshop-settings-${timestampForFile()}.json`);
  const saveOptions = {
    title: 'Export Qwen Workshop settings',
    defaultPath,
    filters: [
      {
        name: 'Qwen Workshop Settings',
        extensions: ['json']
      }
    ]
  };
  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, saveOptions)
    : await dialog.showSaveDialog(saveOptions);

  if (result.canceled || !result.filePath) {
    return null;
  }

  const settings = await settingsStore.getSettings();
  await mkdir(dirname(result.filePath), { recursive: true });
  await writeFile(result.filePath, formatSettingsBackup(settings), 'utf8');

  return {
    path: result.filePath
  };
}

async function importSettingsBackup(): Promise<ImportSettingsBackupResult | null> {
  const openOptions = {
    title: 'Import Qwen Workshop settings',
    properties: ['openFile'] as Array<'openFile'>,
    filters: [
      {
        name: 'Qwen Workshop Settings',
        extensions: ['json']
      }
    ]
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, openOptions)
    : await dialog.showOpenDialog(openOptions);

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  const filePath = result.filePaths[0];
  const contents = await readFile(filePath, 'utf8');
  const importedSettings = readSettingsBackup(JSON.parse(contents) as unknown);
  const currentSettings = await settingsStore.getSettings();
  const settings = await settingsStore.saveSettings({
    ...currentSettings,
    ...importedSettings
  });

  return {
    path: filePath,
    settings
  };
}

async function exportSessionBackup(): Promise<SessionBackupResult | null> {
  const defaultPath = join(app.getPath('documents'), `qwen-workshop-session-${timestampForFile()}.json`);
  const saveOptions = {
    title: 'Export Qwen Workshop session',
    defaultPath,
    filters: [
      {
        name: 'Qwen Workshop Session',
        extensions: ['json']
      }
    ]
  };
  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, saveOptions)
    : await dialog.showSaveDialog(saveOptions);

  if (result.canceled || !result.filePath) {
    return null;
  }

  const session = await sessionStore.getSession();
  await mkdir(dirname(result.filePath), { recursive: true });
  await writeFile(result.filePath, formatSessionBackup(session), 'utf8');

  return {
    path: result.filePath
  };
}

async function importSessionBackup(): Promise<ImportSessionBackupResult | null> {
  const openOptions = {
    title: 'Import Qwen Workshop session',
    properties: ['openFile'] as Array<'openFile'>,
    filters: [
      {
        name: 'Qwen Workshop Session',
        extensions: ['json']
      }
    ]
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, openOptions)
    : await dialog.showOpenDialog(openOptions);

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  const filePath = result.filePaths[0];
  const contents = await readFile(filePath, 'utf8');
  const importedSession = readSessionBackup(JSON.parse(contents) as unknown);
  const session = await sessionStore.saveSession(importedSession);

  return {
    path: filePath,
    session
  };
}

async function exportTranscript(request: ExportTranscriptRequest): Promise<ExportTranscriptResult | null> {
  const defaultDirectory = request.workspacePath?.trim() || app.getPath('documents');
  const defaultPath = join(defaultDirectory, `${safeFilename(request.workspaceName)}-transcript-${timestampForFile()}.md`);
  const saveOptions = {
    title: 'Export Qwen Workshop transcript',
    defaultPath,
    filters: [
      {
        name: 'Markdown',
        extensions: ['md']
      }
    ]
  };
  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, saveOptions)
    : await dialog.showSaveDialog(saveOptions);

  if (result.canceled || !result.filePath) {
    return null;
  }

  await mkdir(dirname(result.filePath), { recursive: true });
  await writeFile(result.filePath, formatTranscriptMarkdown(request), 'utf8');

  return {
    path: result.filePath
  };
}

function formatTranscriptMarkdown(request: ExportTranscriptRequest): string {
  const visibleEntries = request.entries.filter((entry) => entry.role !== 'raw');
  const lines = [
    `# ${request.workspaceName || 'Qwen Workshop'} Transcript`,
    '',
    `Exported: ${new Date().toISOString()}`,
    request.workspacePath ? `Workspace: ${request.workspacePath}` : '',
    '',
    '---',
    ''
  ].filter((line) => line !== '');

  for (const entry of visibleEntries) {
    lines.push(`## ${labelForTranscriptRole(entry.role)}`);
    lines.push('');
    lines.push(`Time: ${entry.createdAt}`);
    lines.push('');

    if (entry.attachments?.length) {
      lines.push('Attachments:');
      for (const attachment of entry.attachments) {
        lines.push(`- ${attachment.name} (${attachment.kind}, ${formatBytesForTranscript(attachment.size)}): ${attachment.path}`);
      }
      lines.push('');
    }

    lines.push(entry.text.trim() || '(empty)');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function runtimeLogPath(): string {
  return join(app.getPath('userData'), 'runtime.log');
}

function labelForTranscriptRole(role: ChatEntry['role']): string {
  if (role === 'assistant') {
    return 'Qwen';
  }

  if (role === 'reasoning') {
    return 'Qwen Reasoning';
  }

  if (role === 'tool') {
    return 'Tool';
  }

  if (role === 'todo') {
    return 'Plan';
  }

  return role === 'user' ? 'You' : role.slice(0, 1).toUpperCase() + role.slice(1);
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function safeFilename(value: string): string {
  const safe = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return safe || 'qwen-workshop';
}

function formatBytesForTranscript(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
