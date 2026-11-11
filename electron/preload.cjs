const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  closeToTray: () => ipcRenderer.send('window-close-to-tray'),
  quit: () => ipcRenderer.send('window-quit'),
  onShowCloseDialog: (callback) => ipcRenderer.on('show-close-dialog', callback),
  getVersion: () => ipcRenderer.invoke('app:version'),
});
