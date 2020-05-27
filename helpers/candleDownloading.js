const axios = require('axios'),
  moment = require('moment'),
  _ = require('lodash'),
  Candle = require('../models/candle'),
  https = require('https'),
  { isCrypto } = require('./symbolData'),
  {
    downloadBulkCurrentEquityData,
    downloadHistoricalEquityData,
    getMostRecentEquityTradingDay,
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
      fromBulkDownload: false,
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
  // since bulk-downloaded candles are "current day", we'll get rid of them before assessing which to download
  await Candle.deleteMany({
    fromBulkDownload: true,
  });
  const today = moment().format('YYYY-MM-DD');
  await Candle.deleteMany({
    date: today,
  });

  const mostRecentTradingDate = await getMostRecentEquityTradingDay();
  const mostRecentTradingCloseDateTime = moment(
    mostRecentTradingDate,
    'YYYY-MM-DD'
  ).add(16, 'hours');

  const getTheseInBulk = []; // because they only need the most recent day

  for (const symbol of symbols) {
    console.log(`Downloading ${symbol}`);
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
      const endDate = today;

      // console.log(
      //   `${symbol}: ${moment(startDate, 'YYYY-MM-DD')
      //     .add(1, 'day')
      //     .format('YYYY-MM-DD')}-${endDate}`
      // );
      // for crypto, it's downloaded in 1 csv file
      await Candle.deleteMany({
        // probably not necessary to clear the range first, but it'll ensure no dupes
        symbol,
        date: { $gte: startDate, $lte: endDate },
      });
      let historicalData = await downloadCryptoData(symbol, startDate, endDate);
      await Candle.insertMany(historicalData);
    } else {
      if (existingMaxDate === mostRecentTradingDate) {
        const candleCreatedDateTime = moment
          .utc(candleWithMaxDate.created)
          .local();
        if (candleCreatedDateTime.isAfter(mostRecentTradingCloseDateTime)) {
          // it was created after the previous market close, so we can use bulk methods to get current-day values
          getTheseInBulk.push(symbol);
          continue;
        }
      }
      // for equities, we'll request it from TDAmeritrade in 5-year chunks
      while (true) {
        let startDate = existingMaxDate
          ? existingMaxDate
          : `${currentYear}-01-01`;
        candleWithMaxDate = null;
        let endDate = `${currentYear + 4}-12-31`;
        if (startDate > today) {
          startDate = today;
        }
        if (endDate > today) {
          endDate = today;
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

        if (endDate === today) {
          break;
        }
        currentYear += 5;
      }
    }
  }
  const currentDayCandles_fromBulk = await downloadBulkCurrentEquityData(
    getTheseInBulk
  );
  if (currentDayCandles_fromBulk.length > 0) {
    await Candle.insertMany(currentDayCandles_fromBulk);
  }
};
