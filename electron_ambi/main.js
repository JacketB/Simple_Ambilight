const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Подключаем preload.js
      contextIsolation: true, // Обеспечиваем изоляцию контекста
      enableRemoteModule: false,
      nodeIntegration: false, // Отключаем nodeIntegration
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();

  // Обработчик IPC для запроса доступных экранов
  ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      mainWindow.loadFile('index.html');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
