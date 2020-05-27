const axios = require('axios'),
  moment = require('moment'),
  _ = require('lodash'),
  { symbolsToDownload, TDA_consumerKey } = require('../helpers/constants'),
  { isCrypto } = require('../helpers/symbolData'),
  { downloadHistoricalEquityData } = require('../helpers/tdaCommunication'),
  https = require('https'),
  mongoApi = require('../helpers/mongoApi'),
  Candle = require('../models/candle');

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

const downloadAndSaveMultipleSymbolHistory = async (symbols) => {
  for (const symbol of symbols) {
    //await Candle.deleteMany({ symbol });
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

    const today = moment().format('YYYY-MM-DD');

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

        // console.log(
        //   `${symbol}: ${moment(startDate, 'YYYY-MM-DD')
        //     .add(1, 'day')
        //     .format('YYYY-MM-DD')}-${endDate}`
        // );
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
};

(async () => {
  await mongoApi.connectMongoose();
  await downloadAndSaveMultipleSymbolHistory(symbolsToDownload);
  await mongoApi.disconnectMongoose();
})();
