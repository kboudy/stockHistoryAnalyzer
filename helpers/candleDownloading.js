const axios = require('axios'),
  moment = require('moment-timezone'),
  _ = require('lodash'),
  Candle = require('../models/candle'),
  https = require('https'),
  { isCrypto } = require('./symbolData'),
  {
    getMostRecentEquityTradingDays,
    downloadBulkCurrentEquityData,
    downloadHistoricalEquityData,
  } = require('./tdaCommunication');

const downloadCryptoData = async (symbol, startDate, endDate) => {
  const endDateYear = parseInt(endDate.split('-')[0]);
  if (endDateYear < 2014) {
    return [];
  }
  const url = `https://www.cryptodatadownload.com/cdd/Gemini_${symbol}_d.csv`;

  const instance = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });
  const res = await instance.get(url);

  const lines = res.data.split('\n');
  const candles = [];
  for (const l of lines) {
    if (!l.startsWith('2')) {
      continue;
    }
    //Date,Symbol,Open,High,Low,Close,Volume BTC,Volume USD
    const parts = l.split(',');
    candles.push({
      created: moment.utc(),
      date: parts[0],
      settled: true, // "settled" means the prices won't change anymore
      symbol,
      open: parseFloat(parts[2]),
      high: parseFloat(parts[3]),
      low: parseFloat(parts[4]),
      close: parseFloat(parts[5]),
      volume: parseInt(parts[7]),
    });
  }
  const filtered = candles.filter(
    (c) =>
      (!startDate || startDate <= c.date) && (!endDate || endDate >= c.date)
  );
  return _.orderBy(filtered, (c) => c.date);
};

exports.downloadAndSaveMultipleSymbolHistory = async (symbols) => {
  // NOTE: since bulk-downloaded candles are "current day", we'll get rid of them before assessing which to download
  // unless it's after market close (5PM or later), then we'll let them live in the db permanently
  await Candle.deleteMany({
    settled: false,
  });

  const currentEasternTime = moment().tz('America/New_York');
  const today = currentEasternTime.format('YYYY-MM-DD');
  await Candle.deleteMany({
    date: today,
  });

  const bulkDownloadDate = _.max(
    (await downloadBulkCurrentEquityData(['SPY']))
      .filter((c) => c.date < today)
      .map((c) => c.date)
  );
  await Candle.deleteMany({
    date: bulkDownloadDate,
  });

  const mostRecentEquityTradingDays = await getMostRecentEquityTradingDays();
  const lastDayToDownloadEquities_theSlowWay = _.max(
    mostRecentEquityTradingDays.filter((d) => d < bulkDownloadDate),
    (d) => d
  );

  // find any symbols that have the last trading date.  They'll be our bulk downloads
  const getTheseInBulk = (
    await Candle.find({
      date: lastDayToDownloadEquities_theSlowWay,
    })
      .lean()
      .select({ symbol: 1 })
  ).map((s) => s.symbol);

  for (const symbol of symbols) {
    if (getTheseInBulk.includes(symbol)) {
      continue;
    }
    console.log(` - Downloading ${symbol}`);
    const symbolIsCrypto = isCrypto(symbol);
    let existingMaxDate = null;
    let currentYear = 1960;

    let candleWithMaxDate = await Candle.findOne({ symbol: symbol })
      .sort({ date: -1 })
      .limit(1);

    if (candleWithMaxDate) {
      //note: i'm always re-requesting the last candle
      currentYear = parseInt(candleWithMaxDate.date.split('-')[0]);
      existingMaxDate = candleWithMaxDate.date;
    }

    if (symbolIsCrypto) {
      const startDate = existingMaxDate ? existingMaxDate : `2000-01-01`;
      const endDate = lastDayToDownloadEquities_theSlowWay;

      // for crypto, it's downloaded in 1 csv file
      await Candle.deleteMany({
        // probably not necessary to clear the range first, but it'll ensure no dupes
        symbol,
        date: { $gte: startDate, $lte: endDate },
      });
      let historicalData = await downloadCryptoData(symbol, startDate, endDate);
      await Candle.insertMany(historicalData);
    } else {
      // for equities, we'll request it from TDAmeritrade in 5-year chunks
      while (true) {
        let startDate = existingMaxDate
          ? existingMaxDate
          : `${currentYear}-01-01`;
        candleWithMaxDate = null;
        let endDate = `${currentYear + 4}-12-31`;
        if (startDate > lastDayToDownloadEquities_theSlowWay) {
          startDate = lastDayToDownloadEquities_theSlowWay;
        }
        if (endDate > lastDayToDownloadEquities_theSlowWay) {
          endDate = lastDayToDownloadEquities_theSlowWay;
        }

        await Candle.deleteMany({
          symbol,
          date: { $gte: startDate, $lte: endDate },
        });
        let historicalData = await downloadHistoricalEquityData(
          symbol,
          startDate,
          endDate
        );

        if (historicalData.length) {
          await Candle.insertMany(historicalData);
        }

        if (endDate === lastDayToDownloadEquities_theSlowWay) {
          // this will include this historical download in the "current day"
          // bulk download at the end
          getTheseInBulk.push(symbol);
          break;
        }
        currentYear += 5;
      }
    }
  }
  if (getTheseInBulk.length > 0)
    console.log('Bulk downloading the symbols that only needed today...');
  const currentDayCandles_fromBulk = await downloadBulkCurrentEquityData(
    getTheseInBulk
  );
  if (currentDayCandles_fromBulk.length > 0) {
    await Candle.insertMany(currentDayCandles_fromBulk);
  }
};
