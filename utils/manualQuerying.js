const _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoApi = require('../helpers/mongoApi'),
  mongoose = require('mongoose'),
  {
    getAvailableSymbolNames,
    isCrypto,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  Candle = require('../models/candle'),
  { optionableSymbols } = require('../helpers/constants'),
  downloadBulkCurrentEquityData = require('../helpers/tdaCommunication'),
  PatternStats = require('../models/patternStats'),
  PaperTrade = require('../models/paperTrade'),
  SymbolInfo = require('../models/symbolInfo'),
  { isNullOrUndefined } = require('../helpers/commonMethods'),
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

const recentProfitLossHistory_allSymbols = async () => {
  const allDates = (await Candle.find({ symbol: 'SPY' })).map((c) => c.date);
  const recentDates = allDates.slice(allDates.length - 100);

  for (const endDate of recentDates) {
    const startDate = allDates[allDates.indexOf(endDate) - 1];
    const candlesBefore = await Candle.find({ date: startDate });
    const candlesBefore_BySymbol = candlesBefore.reduce((reduced, c) => {
      reduced[c.symbol] = parseFloat(`${c.close}`);
      return reduced;
    }, {});

    const candlesAfter = await Candle.find({ date: endDate });
    const candlesAfter_BySymbol = candlesAfter.reduce(
      (reduced, c, currentIndex) => {
        reduced[c.symbol] = parseFloat(`${c.close}`);
        return reduced;
      },
      {}
    );
    const pls = [];
    for (const s in candlesBefore_BySymbol) {
      if (isCrypto(s) || !optionableSymbols.includes(s)) {
        continue;
      }
      if (!isNullOrUndefined(candlesAfter_BySymbol[s])) {
        const thisPl =
          ((candlesAfter_BySymbol[s] - candlesBefore_BySymbol[s]) * 100) /
          candlesBefore_BySymbol[s];
        pls.push(thisPl);
      }
    }
    const avgPL = _.mean(pls);
    console.log(`${startDate},${endDate},${avgPL.toFixed(1)}`);
  }
};

const copyCandlesFromAnotherDb = async () => {
  let currentIdx = 0;
  const incrementer = 10000;
  while (true) {
    await mongoApi2.connectMongoose();
    let candles = await Candle.find({}).skip(currentIdx).limit(incrementer);
    if (candles.length === 0) {
      break;
    }
    candles = candles.filter((c) => c.date <= '2020-05-15');
    await mongoApi2.disconnectMongoose();
    await mongoApi.connectMongoose();
    await Candle.insertMany(candles);
    await mongoApi.disconnectMongoose();
    currentIdx += incrementer;
  }
};

const removeSymbolsThatDontExistInSymbolInfo = async () => {
  await mongoApi.connectMongoose();
  const symbolInfoSymbols = (await SymbolInfo.find({})).map((s) => s.symbol);

  const candleSymbolsToDelete = (await getAvailableSymbolNames()).filter(
    (s) => !symbolInfoSymbols.includes(s)
  );
  for (const s of candleSymbolsToDelete) {
    console.log(`Deleting candles for: ${s}`);
    await Candle.deleteMany({ symbol: s });
  }

  const paperTradeSymbolsToDelete = (await PaperTrade.find({}))
    .map((pt) => pt.symbol)
    .filter((s) => !symbolInfoSymbols.includes(s));
  for (const s of paperTradeSymbolsToDelete) {
    console.log(`Deleting paperTrades for: ${s}`);
    await PaperTrade.deleteMany({ symbol: s });
  }

  debugger;
  await mongoApi.disconnectMongoose();
};

(async () => {
  await mongoApi.connectMongoose();
  await recentProfitLossHistory_allSymbols();
  await mongoApi.disconnectMongoose();
})();
