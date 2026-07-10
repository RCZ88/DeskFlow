const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('focusOverlay', {
  onData: (cb) => ipcRenderer.on('focus:overlay-data', (_e, d) => cb(d)),
  return: () => ipcRenderer.send('focus:overlay-return'),
  break: () => ipcRenderer.send('focus:overlay-break'),
});
