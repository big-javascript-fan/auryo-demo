import { Intent } from '@blueprintjs/core';
import { app, BrowserWindow, BrowserWindowConstructorOptions, Menu, nativeImage, shell } from 'electron';
import * as windowStateKeeper from 'electron-window-state';
import * as _ from 'lodash';
import * as os from 'os';
import * as path from 'path';
import { Store } from 'redux';
import { EVENTS } from '../common/constants/events';
import { StoreState } from '../common/store';
import { addToast } from '../common/store/ui';
import Feature from './features/feature';
import { Logger } from './utils/logger';
import { Utils } from './utils/utils';

const logosPath = process.env.NODE_ENV === 'development' ?
  path.resolve(__dirname, '..', '..', '..', 'assets', 'img', 'logos') :
  path.resolve(__dirname, './assets/img/logos');

const icons = {
  256: nativeImage.createFromPath(path.join(logosPath, 'auryo.png')),
  128: nativeImage.createFromPath(path.join(logosPath, 'auryo-128.png')),
  64: nativeImage.createFromPath(path.join(logosPath, 'auryo-64.png')),
  48: nativeImage.createFromPath(path.join(logosPath, 'auryo-48.png')),
  32: nativeImage.createFromPath(path.join(logosPath, 'auryo-32.png')),
  ico: nativeImage.createFromPath(path.join(logosPath, 'auryo.ico')),
  tray: nativeImage.createFromPath(path.join(logosPath, 'auryo-tray.png')).resize({ width: 24, height: 24 }),
  'tray-ico': nativeImage.createFromPath(path.join(logosPath, 'auryo-tray.ico')).resize({ width: 24, height: 24 })
};

export class Auryo {

  public mainWindow: Electron.BrowserWindow | undefined;
  public store: Store<StoreState>;
  public quitting: boolean = false;
  private logger = new Logger('Main');

  constructor(store: Store<StoreState>) {
    this.store = store;

    app.setAppUserModelId('com.auryo.core');

    app.requestSingleInstanceLock();

    app.on('second-instance', () => {
      app.exit();
    });

    app.on('before-quit', () => {
      this.logger.info('Application exiting...');
      this.quitting = true;
    });
  }

  start() {
    this.logger.profile('app-start');

    const mainWindowState = windowStateKeeper({
      defaultWidth: 1190,
      defaultHeight: 728
    });

    // Browser Window options
    const mainWindowOption: BrowserWindowConstructorOptions = {
      title: `Auryo - ${app.getVersion()}`,
      icon: os.platform() === 'win32' ? icons.ico : icons['256'],
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: 950,
      minHeight: 400,
      titleBarStyle: 'hiddenInset',
      show: false,
      fullscreen: mainWindowState.isFullScreen,
      webPreferences: {
        nodeIntegrationInWorker: true,
        webSecurity: process.env.NODE_ENV !== 'development'
      }
    };

    // Create the browser window
    this.mainWindow = new BrowserWindow(Utils.posCenter(mainWindowOption));

    app.setAccessibilitySupportEnabled(true);

    this.registerTools();

    mainWindowState.manage(this.mainWindow);

    this.mainWindow.setMenu(null);

    this.loadMain();

    this.registerListeners();

    if (process.env.NODE_ENV === 'development' || process.env.ENV === 'development') {
      this.mainWindow.webContents.on('context-menu', (_e, props) => {
        const { x, y } = props;
        Menu.buildFromTemplate([
          {
            label: 'Inspect element',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.inspectElement(x, y);
              }
            }
          },
          {
            label: 'Reload',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.reload();
              }
            }
          }
        ]).popup({ window: this.mainWindow });
      });

      if (process.env.OPEN_DEVTOOLS) {
        this.mainWindow.webContents.openDevTools();
      }
    }

    this.logger.profile('app-start');
    this.logger.info('App started');
  }

  registerTools() {
    const { getTools } = require('./features'); // eslint-disable-line

    const featuresWaitUntil = _.groupBy(getTools(this), 'waitUntil');

    const registerFeature = (feature: Feature) => {
      this.logger.debug(`Registering feature: ${feature.constructor.name}`);
      try {
        feature.register();
      } catch (error) {
        this.logger.error(`Error starting feature: ${feature.constructor.name}`);
        this.logger.error(error);
      }
    };

    Object.keys(featuresWaitUntil)
      .forEach((event: any) => {
        const features = featuresWaitUntil[event];

        features.forEach((feature: Feature) => {
          if (event === 'default') {
            registerFeature(feature);
          } else {
            if (this.mainWindow) {
              this.mainWindow.on(event, registerFeature.bind(this, feature));
            }
          }
        });
      });
  }

  loadMain() {
    if (this.mainWindow) {

      const url = process.env.NODE_ENV === 'development'
        ? `http://localhost:${process.env.DEV_PORT || 8080}`
        : `file://${__dirname}/index.html`;

      this.mainWindow.loadURL(url);

      this.mainWindow.webContents.on('will-navigate', (e, u) => {
        e.preventDefault();

        if (/^(https?:\/\/)/g.exec(u) !== null) {
          if (/https?:\/\/(www.)?soundcloud\.com\//g.exec(u) !== null) {
            if (this.mainWindow) {
              this.mainWindow.webContents.send(EVENTS.APP.PUSH_NAVIGATION, '/resolve', u);
            }
          } else {
            shell.openExternal(u);
          }
        } else if (/^mailto:/g.exec(u) !== null) {
          shell.openExternal(u);
        }
      });

      this.mainWindow.webContents.on('new-window', (e, u) => {
        e.preventDefault();
        if (/^(https?:\/\/)/g.exec(u) !== null) {
          shell.openExternal(u);
        }
      });

      this.mainWindow.webContents.session.webRequest.onCompleted((details) => {
        if (this.mainWindow && (details.url.indexOf('/stream?client_id=') !== -1 || details.url.indexOf('cf-media.sndcdn.com') !== -1)) {
          if (details.statusCode < 200 && details.statusCode > 300) {
            if (details.statusCode === 404) {
              this.store.dispatch(addToast({
                message: 'This resource might not exists anymore',
                intent: Intent.DANGER
              }));
            }
          }
        }
      });
    }
  }

  registerListeners = () => {
    if (this.mainWindow) {
      this.mainWindow.webContents.on('crashed', (event: any) => {
        this.logger.error('APP CRASHED:');
        this.logger.error(event);
      });

      this.mainWindow.on('unresponsive', (event: any) => {
        this.logger.error('APP UNRESPONSIVE:');
        this.logger.error(event);
      });

      this.mainWindow.on('closed', () => {
        this.mainWindow = undefined;
      });

      this.mainWindow.on('close', (event) => {
        if (process.platform === 'darwin') {
          if (this.quitting) {
            this.mainWindow = undefined;
          } else {
            event.preventDefault();

            if (this.mainWindow) {
              this.mainWindow.hide();
            }
          }
        }
      });

      this.mainWindow.on('ready-to-show', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
        }
      });
    }
  }
}
