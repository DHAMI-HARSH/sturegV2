/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const fetch = global.fetch || require('node-fetch');
const { parentPort } = require('worker_threads');
const worker = require('tesseract.js/src/worker-script/index.js');
const getCore = require('tesseract.js/src/worker-script/node/getCore.js');
const gunzip = require('tesseract.js/src/worker-script/node/gunzip.js');
const cache = require('tesseract.js/src/worker-script/node/cache.js');

parentPort.on('message', (packet) => {
  worker.dispatchHandlers(packet, (obj) => parentPort.postMessage(obj));
});

worker.setAdapter({
  getCore,
  gunzip,
  fetch,
  ...cache,
});
