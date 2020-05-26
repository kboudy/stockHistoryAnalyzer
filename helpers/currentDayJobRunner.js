const { getAvailableSymbolNames, isCrypto } = require('./symbolData'),
  _ = require('lodash'),
  mongoApi = require('./mongoApi'),
  moment = require('moment'),
  {
    discoverPatternsForSymbol,
    dropPatternCollections,
  } = require('../helpers/discoverPatternsHelper'),
  CurrentDayEvaluationJobRun = require('../models/currentDayEvaluationJobRun'),
  { numberOfBarsArray } = require('./constants');

const getLogDate = () => {
  return `[${moment().format('YYYY-MM-DD HH:mm:ss')}]`;
};
exports.runJob = async () => {
  const ignoreMatchesAboveThisScore = 12;
  const allSymbols = await getAvailableSymbolNames();
  console.log(`${getLogDate()}* running "CurrentDay" job`);
  /*  
 //TODO: use these if we need to have slightly different code between equity/crypto:
  const equitySymbols = allSymbols.filter((s) => !isCrypto(s));
  const cryptoSymbols = allSymbols.filter((s) => isCrypto(s));
 */
  const symbolsAndPatternStats = {};
  for (const symbol of allSymbols) {
    console.log(
      `${symbol} (${allSymbols.indexOf(symbol) + 1}/${allSymbols.length})`
    );
    for (const nb of numberOfBarsArray) {
      console.log(`  [numberOfBars: ${nb}]`);
      const results = await discoverPatternsForSymbol(
        symbol,
        [symbol],
        nb,
        ignoreMatchesAboveThisScore,
        true
      );
      if (!symbolsAndPatternStats[symbol]) {
        symbolsAndPatternStats[symbol] = {};
      }
      symbolsAndPatternStats[symbol][nb] = results;
    }
  }
  await CurrentDayEvaluationJobRun.create({
    created: moment.utc(),
    results: symbolsAndPatternStats,
  });
  await mongoApi.disconnectMongoose();
  console.log(`${getLogDate()}* complete`);
};
