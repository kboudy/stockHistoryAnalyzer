const { getAvailableSymbolNames, isCrypto } = require('../helpers/symbolData'),
  _ = require('lodash'),
  mongoApi = require('../helpers/mongoApi'),
  moment = require('moment'),
  {
    discoverPatternsForSymbol,
    dropPatternCollections,
  } = require('../helpers/discoverPatternsHelper'),
  CurrentDayEvaluationJobRun = require('../models/currentDayEvaluationJobRun'),
  { numberOfBarsArray } = require('../helpers/constants');

(async () => {
  await mongoApi.connectMongoose();

  const ignoreMatchesAboveThisScore = 12;
  const allSymbols = await getAvailableSymbolNames();
  const equitySymbols = allSymbols.filter((s) => !isCrypto(s));
  const cryptoSymbols = allSymbols.filter((s) => isCrypto(s));

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
})();
