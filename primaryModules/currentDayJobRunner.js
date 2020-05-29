//PURPOSE: find the best patternStats criteria to use as real trade triggers, by cycling through values

// trying the simple node cluster api (for parallel runs)
// https://www.sitepoint.com/how-to-create-a-node-js-cluster-for-speeding-up-your-apps/
const cluster = require('cluster'),
  _ = require('lodash'),
  { runCurrentDayJob } = require('../helpers/currentDayJobRunEngine'),
  { getAvailableSymbolNames } = require('../helpers/symbolData'),
  {
    downloadAndSaveMultipleSymbolHistory,
  } = require('../helpers/candleDownloading'),
  { chunkArray, sleep } = require('../helpers/commonMethods'),
  chalk = require('chalk'),
  moment = require('moment'),
  CurrentDayEvaluationJobRun = require('../models/currentDayEvaluationJobRun'),
  os = require('os'),
  mongoApi = require('../helpers/mongoApi'),
  constants = require('../helpers/constants');

// using 3/4 the cpus - might want to up that
const numWorkers = Math.round(require('os').cpus().length * 0.75);
const SYMBOL_CHUNK_SIZE = 50;

const argOptions = {};
const { argv } = require('yargs')
  .alias('help', 'h')
  .version(false)
  .options(argOptions);

if (cluster.isMaster) {
  (async () => {
    await mongoApi.connectMongoose();
    let allSymbols = await getAvailableSymbolNames();
    let lastLoggedPercentComplete = 0;
    let symbolsLeftToProcess = allSymbols.length;
    let symbolChunks = chunkArray(allSymbols, SYMBOL_CHUNK_SIZE);
    let gatheredResults = {};
    const fireOffNewChunk = async (symbolChunk) => {
      const worker = cluster.fork();
      worker.on('message', (res) => {
        const { results, originalChunkSize } = res;
        gatheredResults = { ...gatheredResults, ...results };
        symbolsLeftToProcess = symbolsLeftToProcess - originalChunkSize;
      });
      worker.send({ runTheseSymbols: symbolChunk });
    };
    cluster.on('exit', async (worker, code, signal) => {
      if (symbolChunks.length > 0) {
        const symbolChunk = symbolChunks[0];
        symbolChunks = symbolChunks.slice(1);
        await fireOffNewChunk(symbolChunk);

        const percentComplete = Math.round(
          (100 * (allSymbols.length - symbolsLeftToProcess)) / allSymbols.length
        );
        if (percentComplete - lastLoggedPercentComplete >= 5) {
          lastLoggedPercentComplete = percentComplete;
          console.log(`${percentComplete}%`);
        }
      }
      if (symbolsLeftToProcess === 0) {
        // done - save the gathered results
        await CurrentDayEvaluationJobRun.create({
          created: moment.utc(),
          results: gatheredResults,
        });
        await mongoApi.disconnectMongoose();
        console.log('job complete');
      }
    });
    console.log(`starting job - spinning off ${numWorkers} processes`);

    console.log('  -- downloading latest symbol data');
    await downloadAndSaveMultipleSymbolHistory(allSymbols);

    for (let i = 0; i < numWorkers; i++) {
      if (symbolChunks.length > 0) {
        const symbolChunk = symbolChunks[0];
        symbolChunks = symbolChunks.slice(1);

        await fireOffNewChunk(symbolChunk);
      }
    }
  })();
} else {
  process.on('message', (message) => {
    (async () => {
      await mongoApi.connectMongoose();
      //message from the master
      const { runTheseSymbols } = message;
      const results = await runCurrentDayJob(runTheseSymbols);
      process.send({ results, originalChunkSize: runTheseSymbols.length });
      await mongoApi.disconnectMongoose();
      process.exit(0);
    })();
  });
}
