const _ = require('lodash'),
  moment = require('moment'),
  mongoApi = require('../helpers/mongoApi'),
  mongoose = require('mongoose'),
  {
    getAvailableSymbolNames,
    isCrypto,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  { significantBars } = require('../helpers/constants'),
  Candle = require('../models/candle'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun'),
  TradeSimulationRun = require('../models/tradeSimulationRun');

const confirmDaysBetweenShouldntExist = async (
  symbol,
  equitySymbols,
  currentDate,
  daysBetween
) => {
  const otherEquitySymbols = equitySymbols.filter((s) => s !== symbol);
  let d = moment(currentDate.format('YYYY-MM-DD')); // de-reference
  let missingDayCount = daysBetween - 1;
  while (missingDayCount > 0) {
    d.add(-1, 'days');
    missingDayCount--;
    const dayOfWeek = d.day();
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      // it's a weekend
      continue;
    }
    const formattedDate = d.format('YYYY-MM-DD');
    const missingDayInOtherEquityCandles = await Candle.findOne({
      symbol: { $in: otherEquitySymbols },
      date: formattedDate,
    });
    if (missingDayInOtherEquityCandles) {
      console.log(
        `  - The date "${formattedDate}" was missing for ${symbol}, but existed in other equities`
      );
    }
  }
};

const validateCandleDates = async () => {
  const allSymbols = await getAvailableSymbolNames();
  const equitySymbols = allSymbols.filter((s) => !isCrypto(s));

  for (const symbol of allSymbols) {
    console.log(`Evaluating candle dates for ${symbol}`);
    const candleDates = (await loadHistoricalDataForSymbol(symbol)).map(
      (c) => c.date
    );
    let previousDate = null;
    for (const date of candleDates) {
      const currentDate = moment(date, 'YYYY-MM-DD');
      if (previousDate) {
        const daysBetween = Math.round(
          moment.duration(currentDate.diff(previousDate)).asDays()
        );
        if (daysBetween === 1) {
          previousDate = currentDate;
          continue;
        }
        if (daysBetween === 0) {
          throw 'duplicate dates';
        }
        if (daysBetween < 0) {
          throw 'dates out of order';
        }
        if (isCrypto(symbol)) {
          `There were ${daysBetween} days between ${previousDate.format(
            'YYYY-MM-DD'
          )} and ${currentDate.format(
            'YYYY-MM-DD'
          )}, which shouldn't happen for crypto`;
        }
        await confirmDaysBetweenShouldntExist(
          symbol,
          equitySymbols,
          currentDate,
          daysBetween
        );
      }
      previousDate = currentDate;
    }
  }
};

const createIndexes = async () => {
  const tradeSimulationRunsCollection = await mongoose.connection.db.collection(
    'tradesimulationruns'
  );
  const existingIndexes = await TradeSimulationRun.collection.getIndexes();
  for (const idxName of Object.keys(existingIndexes)) {
    if (idxName !== '_id_') {
      await tradeSimulationRunsCollection.dropIndex(idxName);
    }
  }
  await tradeSimulationRunsCollection.createIndex(
    { 'criteria.symbol': 1 },
    { sparse: true }
  ); // sparse will not index documents without this field
  await tradeSimulationRunsCollection.createIndex(
    { 'criteria.includeOtherSymbolsTargets': 1 },
    { sparse: true }
  );
  await tradeSimulationRunsCollection.createIndex(
    { 'criteria.numberOfBars': 1 },
    { sparse: true }
  );
  await tradeSimulationRunsCollection.createIndex(
    { 'criteria.significantBar': 1 },
    { sparse: true }
  );
  await tradeSimulationRunsCollection.createIndex(
    { 'results.avgProfitLossPercent': 1 },
    { sparse: true }
  );
  await tradeSimulationRunsCollection.createIndex(
    { 'results.percentProfitable': 1 },
    { sparse: true }
  );
  await tradeSimulationRunsCollection.createIndex(
    { 'results.tradeCount': 1 },
    { sparse: true }
  );
  await tradeSimulationRunsCollection.createIndex(
    { 'results.tradeCountPerYear': 1 },
    { sparse: true }
  );
};

const misc = async () => {
  const psjr = await PatternStatsJobRun.findOne({
    sourceSymbol: 'TSLA',
    numberOfBars: 15,
    targetSymbols: { $size: 12 },
  });

  const ps = await PatternStats.find({
    jobRun: psjr.id,
    'percentProfitable_atBarX.30': { $gte: 60 },
    'avg_maxUpsidePercent_byBarX.30': { $gte: 1 },
    scoreCount: { $gte: 10 },
    avgScore: { $lte: 10 },
  });

  debugger;
};

(async () => {
  await mongoApi.connectMongoose();
  await misc();
  await mongoApi.disconnectMongoose();
})();
