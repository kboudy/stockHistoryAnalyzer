const { loadHistoricalDataForSymbol } = require('./symbolData'),
  _ = require('lodash'),
  moment = require('moment'),
  { discoverPatternsForSymbol } = require('./discoverPatternsHelper'),
  { isNullOrUndefined, percentile } = require('./commonMethods'),
  { numberOfBarsArray } = require('./constants');

const significantBarToUse_forThresholdEvaluation = 1;
const getLogDate = () => {
  return `[${moment().format('YYYY-MM-DD HH:mm:ss')}]`;
};

const getPLAveragesAcrossAllNumberOfBars = (
  symbolPatternStats,
  significantBarToFocusOn
) => {
  // get pl averaged over all numberOfBars - for the significantBar we are focusing on
  let pl_sum = 0;
  let pl_profitable_count = 0;
  let pl_count = 0;
  for (const nb in symbolPatternStats) {
    if (isNullOrUndefined(symbolPatternStats[nb])) {
      continue;
    }
    for (const sb in symbolPatternStats[nb].avg_profitLossPercent_atBarX) {
      if (parseInt(sb) !== significantBarToFocusOn) {
        continue;
      }
      if (
        !isNullOrUndefined(
          symbolPatternStats[nb].avg_profitLossPercent_atBarX
        ) &&
        !isNullOrUndefined(
          symbolPatternStats[nb].avg_profitLossPercent_atBarX[sb]
        )
      ) {
        const pl = symbolPatternStats[nb].avg_profitLossPercent_atBarX[sb];
        if (pl > 0) {
          pl_profitable_count++;
        }
        pl_sum += pl;
        pl_count++;
      }
    }
  }

  const avgPL = pl_sum / pl_count;
  const avgPercentProfitable = (100 * pl_profitable_count) / pl_count;
  return { avgPL, avgPercentProfitable };
};

exports.runCurrentDayJob = async (symbols, logToConsole = false) => {
  const ignoreMatchesAboveThisScore = 12;
  if (logToConsole) {
    console.log(
      `${getLogDate()}* running "CurrentDay" job with ${symbols.length} symbols`
    );
  }

  const temp_avgPLForSB = [];
  const temp_avgPercentProfitableForSB = [];
  const symbolsAndPatternStats = {};
  for (const symbol of symbols) {
    const thisSymbolPatternStats = {};
    if (logToConsole) {
      console.log(
        `${symbol} (${symbols.indexOf(symbol) + 1}/${symbols.length})`
      );
    }
    const sourcePriceHistory = await loadHistoricalDataForSymbol(symbol);
    for (const nb of numberOfBarsArray) {
      let results = await discoverPatternsForSymbol(
        symbol,
        sourcePriceHistory,
        [symbol],
        nb,
        ignoreMatchesAboveThisScore,
        sourcePriceHistory.length - 1
      );

      if (results) {
        // no need for the .pastResults field, since there are no .futureResults with currentDay
        results = { ...results, ...results.pastResults };
        delete results.pastResults;

        if (!thisSymbolPatternStats) {
          thisSymbolPatternStats = {};
        }
        thisSymbolPatternStats[nb] = results;
      }
    }

    // we'll add these two aggregated stats temporarily, so we can sort by them & return only the best
    const { avgPL, avgPercentProfitable } = getPLAveragesAcrossAllNumberOfBars(
      thisSymbolPatternStats,
      significantBarToUse_forThresholdEvaluation
    );
    temp_avgPLForSB.push(avgPL);
    temp_avgPercentProfitableForSB.push(avgPercentProfitable);
    thisSymbolPatternStats['temp_avgPL'] = avgPL;
    thisSymbolPatternStats['temp_avgPercentProfitable'] = avgPercentProfitable;
    symbolsAndPatternStats[symbol] = thisSymbolPatternStats;
  }

  // finally we'll use those temp_ criteria to eliminate the bulk of the results
  const minPL = percentile(
    _.orderBy(temp_avgPLForSB, (pl) => -pl),
    0.1
  );
  const minPercentProfitable = percentile(
    _.orderBy(temp_avgPercentProfitableForSB, (plpp) => -plpp),
    0.1
  );

  // now that we know the percentile, we'll sort them & return only the best
  const filtered = {};
  for (const symbol in symbolsAndPatternStats) {
    const thisPS = symbolsAndPatternStats[symbol];
    if (
      thisPS.temp_avgPL >= minPL ||
      thisPS.temp_avgPercentProfitable >= minPercentProfitable
    ) {
      delete thisPS.temp_avgPL;
      delete thisPS.temp_avgPercentProfitable;
      filtered[symbol] = thisPS;
    }
  }

  if (logToConsole) {
    console.log(`${getLogDate()} currentDay sub-job run complete`);
    console.log(
      `returning the top ${Object.keys(filtered).length}/${
        Object.keys(symbolsAndPatternStats).length
      } results`
    );
  }

  return filtered;
};
