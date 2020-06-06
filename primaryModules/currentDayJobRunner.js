//PURPOSE: find the best patternStats criteria to use as real trade triggers, by cycling through values

// trying the simple node cluster api (for parallel runs)
// https://www.sitepoint.com/how-to-create-a-node-js-cluster-for-speeding-up-your-apps/
const cluster = require('cluster'),
  _ = require('lodash'),
  { runCurrentDayJob } = require('../helpers/currentDayJobRunEngine'),
  { getAvailableSymbolNames, isCrypto } = require('../helpers/symbolData'),
  {
    downloadAndSaveMultipleSymbolHistory,
  } = require('../helpers/candleDownloading'),
  { chunkArray, sleep } = require('../helpers/commonMethods'),
  chalk = require('chalk'),
  moment = require('moment-timezone'),
  CurrentDayEvaluationJobRun = require('../models/currentDayEvaluationJobRun'),
  os = require('os'),
  mongoApi = require('../helpers/mongoApi'),
  constants = require('../helpers/constants');

// using 3/4 the cpus - might want to up that
const numWorkers = Math.round(require('os').cpus().length * 0.75);
const SYMBOL_CHUNK_SIZE = 50;

const argOptions = {
  historicalDate: {
    alias: 'd',
    description: `run for a historical date (format: YYYY-MM-DD)`,
  },
};

const { argv } = require('yargs')
  .alias('help', 'h')
  .version(false)
  .options(argOptions);

if (cluster.isMaster) {
  (async () => {
    await mongoApi.connectMongoose();
    let allSymbols = (await getAvailableSymbolNames()).filter(
      (s) => !isCrypto(s)
    );
    let lastLoggedPercentComplete = 0;
    let symbolsLeftToProcess = allSymbols.length;
    let symbolChunks = chunkArray(allSymbols, SYMBOL_CHUNK_SIZE);
    let gatheredResults = {};
    const startNewWorker = async (symbolChunk) => {
      const worker = cluster.fork();
      worker.on('message', (res) => {
        const { results, originalChunkSize } = res;
        gatheredResults = { ...gatheredResults, ...results };
        symbolsLeftToProcess = symbolsLeftToProcess - originalChunkSize;
      });
      worker.send({
        runTheseSymbols: symbolChunk,
        historicalDate: argv.historicalDate,
      });
    };
    cluster.on('exit', async (worker, code, signal) => {
      if (symbolChunks.length > 0) {
        const symbolChunk = symbolChunks[0];
        symbolChunks = symbolChunks.slice(1);
        await startNewWorker(symbolChunk);

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

        let createdDate = argv.historicalDate
          ? moment(`${argv.historicalDate} 4:00PM`, 'YYYY-MM-DD h:mmA').utc()
          : moment.utc();
        await CurrentDayEvaluationJobRun.create({
          created: createdDate,
          results: gatheredResults,
        });
        await mongoApi.disconnectMongoose();
        console.log('job complete');
      }
    });
    console.log('Downloading latest symbol data');
    await downloadAndSaveMultipleSymbolHistory(allSymbols);

    console.log(
      `Starting current day job: spinning off ${numWorkers} processes`
    );
    for (let i = 0; i < numWorkers; i++) {
      if (symbolChunks.length > 0) {
        const symbolChunk = symbolChunks[0];
        symbolChunks = symbolChunks.slice(1);

        await startNewWorker(symbolChunk);
      }
    }
  })();
} else {
  process.on('message', (message) => {
    (async () => {
      await mongoApi.connectMongoose();
      //message from the master
      const { runTheseSymbols, historicalDate } = message;
      const results = await runCurrentDayJob(runTheseSymbols, historicalDate);
      process.send({ results, originalChunkSize: runTheseSymbols.length });
      await mongoApi.disconnectMongoose();
      process.exit(0);
    })();
  });
}
