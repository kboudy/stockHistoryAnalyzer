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
  PatternStatsJobRun = require('../models/patternStatsJobRun');

const findMinSourceDate = async () => {
  const minSourceDate = (
    await PatternStats.findOne({}).sort({ sourceDate: 1 }).limit(1)
  ).sourceDate;
};

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
  //note: this is not necessary to run, since they're now defined in the schema
  const patternStatsCollection = await mongoose.connection.db.collection(
    'patternstats'
  );
  const existingIndexes = await PatternStats.collection.getIndexes();
  for (const idxName of Object.keys(existingIndexes)) {
    if (idxName !== '_id_') {
      await patternStatsCollection.dropIndex(idxName);
    }
  }

  const fieldNames = Object.keys(PatternStats.schema.obj);
  for (const fieldName of fieldNames) {
    if (['scoreDates'].includes(fieldName)) {
      continue;
    }
    if (
      fieldName.toLowerCase().includes('_atbarx') ||
      fieldName.toLowerCase().includes('_bybarx')
    ) {
      continue;
      /*       for (const sb of significantBars) {
        const fieldNameWithBar = `${fieldName}.${sb}`;
        await patternStatsCollection.createIndex(
          { [fieldNameWithBar]: 1 },
          { sparse: true }
        ); // sparse will not index documents without this field
      } */
    } else {
      console.log(`creating index for ${fieldName}`);
      await patternStatsCollection.createIndex(
        { [fieldName]: 1 },
        { sparse: true }
      ); // sparse will not index documents without this field
    }
  }
};

(async () => {
  await mongoApi.connectMongoose();
  await createIndexes();
  await mongoApi.disconnectMongoose();
})();
