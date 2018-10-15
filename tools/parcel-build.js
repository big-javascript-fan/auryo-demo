/* tslint:disable */

const { run } = require('./run-bin');

const commonOptions = [
  '--no-cache',
  '--target',
  'electron'
];

const rendererOptions = [
  './static/index.html',
  '--out-dir',
  'dist',
  '--public-url',
  './',
  ...commonOptions
];

const mainOptions = [
  './src/main/index.ts',
  '--out-dir',
  'dist/main',
  ...commonOptions
];

async function compileParcel() {
  await run('Parcel (Renderer)', 'parcel', ['build', ...rendererOptions ]);
  await run('Parcel (Main)', 'parcel', [ 'build', ...mainOptions ]);
};

module.exports = {
  compileParcel,
  rendererOptions,
  mainOptions
}

if (require.main === module) compileParcel();
