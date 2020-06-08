const { loadHistoricalDataForSymbol } = require('./symbolData'),
  _ = require('lodash'),
  moment = require('moment'),
  { discoverPatternsForSymbol } = require('./discoverPatternsHelper'),
  { isNullOrUndefined, isObject, percentile } = require('./commonMethods'),
  { numberOfBarsArray } = require('./constants');

const ALL_FIELD_NAME = 'all';

const significantBarToUse_forThresholdEvaluation = 1;
const getLogDate = () => {
  return `[${moment().format('YYYY-MM-DD HH:mm:ss')}]`;
};

// this is the automated "buy these today" filter
exports.applyStringentFilter = (results, heldDays) => {
  const isSingleHeldDay = parseInt(heldDays) === 1;
  const symbolsThatPass = [];
  for (const symbol in results) {
    let passes = true;
    // first the aggregated/all filters
    const allNode = results[symbol][ALL_FIELD_NAME];
    const minPl = isSingleHeldDay ? 1 : 3;
    const minPP = 60;
    const minScoreCount = 15;
    if (
      allNode.avg_profitLossPercent_atBarX[heldDays] < minPl ||
      allNode.percentProfitable_atBarX[heldDays] < minPP ||
      allNode.scoreCount < minScoreCount
    ) {
      continue;
    }

    // then the non-aggregated filters
    for (const nb in results[symbol]) {
      if (nb === ALL_FIELD_NAME) {
        continue;
      }
      const { scoreCount } = results[symbol][nb];
      const avgPL =
        results[symbol][nb].avg_profitLossPercent_atBarX[[heldDays]];
      const minPLNonAgg = isSingleHeldDay ? -0.5 : 0;
      if (avgPL < minPLNonAgg && scoreCount > 2) {
        passes = false;
        break;
      }
      const minPLPercentProfitableNonAgg = 50;
      const avgProfitablePercent =
        results[symbol][nb].percentProfitable_atBarX[[heldDays]];
      if (
        avgProfitablePercent < minPLPercentProfitableNonAgg &&
        scoreCount > 2
      ) {
        passes = false;
        break;
      }
    }
    if (!passes) {
      continue;
    }

    symbolsThatPass.push(symbol);
  }
  for (const s in results) {
    if (!symbolsThatPass.includes(s)) {
      delete results[s];
    }
  }

  // finally, choose the top 10 results, sorting by aggregated % profitable
  const pProfitable = Object.keys(results).map((symbol) => {
    return {
      symbol,
      percentProfitable:
        results[symbol][ALL_FIELD_NAME].percentProfitable_atBarX[heldDays],
      // avgProfitLossPercent:
      //   results[symbol][ALL_FIELD_NAME].avg_profitLossPercent_atBarX[heldDays],
    };
  });
  const topPercentProfitable = _.take(
    _.orderBy(pProfitable, (p) => -p.percentProfitable),
    15
  ).map((pp) => pp.symbol);
  // const top7ProfitLoss = _.take(
  //   _.orderBy(pProfitable, (p) => -p.avgProfitLossPercent),
  //   7
  // ).map((pp) => pp.symbol);

  for (const s in results) {
    if (!topPercentProfitable.includes(s)) {
      delete results[s];
    }
  }

  return results;
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

const addInAverages = (results) => {
  // add the averaged (per symbol+numberOfBars) fields
  for (const symbol in results) {
    const symbolNode = results[symbol];
    const averagedNode = {};
    symbolNode[ALL_FIELD_NAME] = averagedNode;
    for (const numberOfBar in symbolNode) {
      if (numberOfBar === ALL_FIELD_NAME) {
        continue;
      }
      for (const fieldName in symbolNode[numberOfBar]) {
        const scoreCount = symbolNode[numberOfBar].scoreCount;
        const fieldObj = symbolNode[numberOfBar][fieldName];

        if (fieldName === 'sourceDate') {
          continue;
        } else if (fieldName === 'scoreDates') {
          if (!averagedNode[fieldName]) {
            averagedNode[fieldName] = [];
          }
          averagedNode[fieldName] = [...averagedNode[fieldName], ...fieldObj];
        } else if (fieldName === 'scoreCount') {
          if (!averagedNode[fieldName]) {
            averagedNode[fieldName] = 0;
          }
          averagedNode[fieldName] += fieldObj;
        } else {
          // anything else should be averaged
          //  - could be a numeric value, or an object with significantBars fields
          const fieldObjUsesSignificantBars =
            isObject(fieldObj) && !Object.keys(fieldObj).includes('divisor');
          if (fieldObjUsesSignificantBars) {
            // it's segmented into significant bars
            if (!averagedNode[fieldName]) {
              averagedNode[fieldName] = {};
            }
            for (const sb in fieldObj) {
              if (!averagedNode[fieldName][sb]) {
                averagedNode[fieldName][sb] = {
                  runningTotal: 0,
                  divisor: 0,
                };
              }
              averagedNode[fieldName][sb].runningTotal =
                averagedNode[fieldName][sb].runningTotal +
                scoreCount * fieldObj[sb];
              averagedNode[fieldName][sb].divisor =
                averagedNode[fieldName][sb].divisor + scoreCount;
            }
          } else {
            // it's a numeric value, not segmented into significant bars
            if (!averagedNode[fieldName]) {
              averagedNode[fieldName] = { runningTotal: 0, divisor: 0 };
            }
            averagedNode[fieldName].runningTotal += scoreCount * fieldObj;
            averagedNode[fieldName].divisor += scoreCount;
          }
        }
      }
    }
  }

  // finally, average the runningTotal/divisor combos
  for (const symbol in results) {
    const symbolNode = results[symbol];
    const averagedNode = symbolNode[ALL_FIELD_NAME];
    for (const fieldName in averagedNode) {
      if (fieldName === 'sourceDate' || fieldName === 'scoreCount') {
        continue;
      }
      const fieldObj = averagedNode[fieldName];
      if (fieldObj.divisor) {
        // it was a simple value - we can avg it up here
        averagedNode[fieldName] = fieldObj.runningTotal / fieldObj.divisor;
      } else {
        // it has significant bars
        for (const sb in fieldObj) {
          averagedNode[fieldName][sb] =
            fieldObj[sb].runningTotal / fieldObj[sb].divisor;
        }
      }
    }
  }
  return results;
};

exports.runCurrentDayJob = async (
  symbols,
  historicalDate = null,
  logToConsole = false
) => {
  const strHistDateMessage = historicalDate
    ? ` for historical date ${historicalDate}`
    : '';
  const ignoreMatchesAboveThisScore = 12;
  if (logToConsole) {
    console.log(
      `${getLogDate()}* running "CurrentDay" job with ${
        symbols.length
      } symbols${strHistDateMessage}`
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
    let specificSourceIndex = sourcePriceHistory.length - 1;
    if (historicalDate) {
      specificSourceIndex = sourcePriceHistory.indexOf(
        sourcePriceHistory.filter((s) => s.date === historicalDate)[0]
      );
    }
    for (const nb of numberOfBarsArray) {
      let results = await discoverPatternsForSymbol(
        symbol,
        sourcePriceHistory,
        [symbol],
        nb,
        ignoreMatchesAboveThisScore,
        false,
        false,
        false,
        specificSourceIndex
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

  const withAverages = addInAverages(filtered);
  return withAverages;
};
