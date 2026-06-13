module.exports = {
  app: {
    getPath: () => '/tmp/test-desktop-secretary',
    isPackaged: false,
    on: jest.fn(),
    quit: jest.fn(),
  },
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  ipcRenderer: { invoke: jest.fn(), on: jest.fn(), removeListener: jest.fn() },
  BrowserWindow: jest.fn(),
  Tray: jest.fn(),
  Menu: { buildFromTemplate: jest.fn() },
  nativeImage: { createFromPath: jest.fn(), createEmpty: jest.fn() },
  screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }) },
  shell: { openPath: jest.fn(), openExternal: jest.fn() },
  dialog: { showOpenDialog: jest.fn() },
  contextBridge: { exposeInMainWorld: jest.fn() },
}
