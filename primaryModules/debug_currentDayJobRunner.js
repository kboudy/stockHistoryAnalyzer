//PURPOSE: find the best patternStats criteria to use as real trade triggers, by cycling through values

// trying the simple node cluster api (for parallel runs)
// https://www.sitepoint.com/how-to-create-a-node-js-cluster-for-speeding-up-your-apps/
const _ = require('lodash'),
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

const SYMBOL_CHUNK_SIZE = 50;

const historicalDate = '2020-03-24';

(async () => {
  await mongoApi.connectMongoose();
  let allSymbols = (await getAvailableSymbolNames()).filter(
    (s) => !isCrypto(s)
  );
  let symbolChunks = chunkArray(allSymbols, SYMBOL_CHUNK_SIZE);
  let gatheredResults = {};

  console.log(`Starting current day job`);
  while (symbolChunks.length > 0) {
    const symbolChunk = symbolChunks[0];
    symbolChunks = symbolChunks.slice(1);
    console.log(`Chunks remaining: ${symbolChunks.length}`);
    const results = await runCurrentDayJob(symbolChunk, historicalDate);
    gatheredResults = { ...gatheredResults, ...results };
  }

  let createdDate = historicalDate
    ? moment(`${historicalDate} 4:00PM`, 'YYYY-MM-DD h:mmA').utc()
    : moment.utc();
  const currentDayEvaluationJobRun = await CurrentDayEvaluationJobRun.create({
    created: createdDate,
    results: gatheredResults,
  });
  console.log(`Created job id: ${currentDayEvaluationJobRun.id}`);

  await mongoApi.disconnectMongoose();
})();
