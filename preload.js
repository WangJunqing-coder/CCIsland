const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ccIsland', {
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (_event, data) => callback(data));
  },
  setIgnoreMouse: (ignore) => {
    ipcRenderer.send('set-ignore-mouse', ignore);
  },
  resizeWindow: (width, height) => {
    ipcRenderer.send('resize-window', { width, height });
  },
});
