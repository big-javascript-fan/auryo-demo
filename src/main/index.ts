import { app } from 'electron';
import { Auryo } from './app';
import { configureStore } from './store';
import * as CrashReporter from './utils/raven';
import { Utils } from './utils/utils';
import { enableLiveReload } from 'electron-compile';

const isDevMode = process.execPath.match(/[\\/]electron/);

if (isDevMode) {
  enableLiveReload({strategy: 'react-hmr'});
}

if (process.env.TOKEN) {
  process.env.ENV = 'test';
}

if (process.argv.some(arg => arg === '--development') || process.argv.some(arg => arg === '--dev')) {
  process.env.ENV = 'development';
}

CrashReporter.initialize();

const store = configureStore();

const auryo = new Auryo(store);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); }
});

app.on('activate', () => {
  if (auryo.mainWindow) {
    auryo.mainWindow.show();
  } else {
    // Something went wrong
    app.quit();
  }
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', () => {
  if (process.env.NODE_ENV === 'development') {
    Utils.installExtensions();
  }

  auryo.start();
});
