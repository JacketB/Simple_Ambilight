const { contextBridge, ipcRenderer } = require('electron');

// Экспонируем функцию getSources в рендерный процесс
contextBridge.exposeInMainWorld('electron', {
  getSources: () => ipcRenderer.invoke('get-sources')
});
