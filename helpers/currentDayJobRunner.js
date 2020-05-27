const { getAvailableSymbolNames, isCrypto } = require('./symbolData'),
  _ = require('lodash'),
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

exports.runCurrentDayJob = async () => {
  const ignoreMatchesAboveThisScore = 12;
  const allSymbols = await getAvailableSymbolNames();
  console.log(`${getLogDate()}* running "CurrentDay" job`);

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
  const job = await CurrentDayEvaluationJobRun.create({
    created: moment.utc(),
    results: symbolsAndPatternStats,
  });
  console.log(`${getLogDate()}* complete`);
  return job;
};
