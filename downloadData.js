const axios = require('axios'),
  moment = require('moment'),
  _ = require('lodash'),
  { TDA_consumerKey } = require('./helpers/constants'),
  { sleep } = require('./helpers/miscMethods'),
  https = require('https'),
  mongoApi = require('./helpers/mongoApi'),
  Candle = require('./models/candle'),
  fs = require('fs');

const extractCryptoData = async (symbol, startDate, endDate) => {
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

const extractEquityData = async (symbol, startDate, endDate) => {
  const mStart = moment.utc(`${startDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();
  const mEnd = moment.utc(`${endDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();
  const url = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?apikey=${TDA_consumerKey}&periodType=year&period=2&frequencyType=daily&startDate=${mStart}&endDate=${mEnd}`;

  let res;
  try {
    const instance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });
    res = await instance.get(url);
    await sleep(100); // to keep from getting a 429 - "too many requests", from TDAmeritrade
  } catch (err) {
    // forgive the error if the start & end dates are the same
    if (startDate !== endDate) {
      throw err;
    } else {
      return [];
    }
  }

  const { candles } = res.data;
  for (const candle of candles) {
    candle.date = moment(candle.datetime).format('YYYY-MM-DD');
    candle.symbol = symbol;
    delete candle.datetime;
  }
  return _.orderBy(candles, (c) => c.date);
};

const getHistoricalDataForSymbol = async (symbol, startDate, endDate) => {
  const isCrypto = symbol === 'BTCUSD' || symbol === 'ETHUSD';
  return isCrypto
    ? extractCryptoData(symbol, startDate, endDate)
    : extractEquityData(symbol, startDate, endDate);
};

const downloadAndSaveMultipleSymbolHistory = async (symbols) => {
  for (const symbol of symbols) {
    console.log(`Downloading ${symbol}`);
    let existingMaxDate = null;
    let currentYear = 1960;

    let candleWithMaxDate = await Candle.findOne({ symbol: symbol })
      .sort({ date: -1 })
      .limit(1);

    if (candleWithMaxDate) {
      //note: i'm always wiping & re-requesting the last candle
      await candleWithMaxDate.remove();
      currentYear = parseInt(candleWithMaxDate.date.split('-')[0]);
      existingMaxDate = candleWithMaxDate.date;
    }

    const yesterday = moment().add(-1, 'days').format('YYYY-MM-DD');
    while (true) {
      let startDate = existingMaxDate
        ? existingMaxDate
        : `${currentYear}-01-01`;
      candleWithMaxDate = null;
      let endDate = `${currentYear + 4}-01-01`;
      if (startDate > yesterday) {
        startDate = yesterday;
      }
      if (endDate > yesterday) {
        endDate = yesterday;
      }
      const historicalData = await getHistoricalDataForSymbol(
        symbol,
        startDate,
        endDate
      );

      if (historicalData.length) {
        await Candle.insertMany(historicalData);
      }

      if (endDate === yesterday) {
        break;
      }
      currentYear += 5;
    }
  }
};

(async () => {
  await mongoApi.connectMongoose();
  await downloadAndSaveMultipleSymbolHistory([
    'AAPL',
    'AMZN',
    'BTCUSD',
    'EEM',
    'EFA',
    'GLD',
    'HPQ',
    'HYG',
    'IWM',
    'QQQ',
    'SLV',
    'SPY',
    'TSLA',
  ]);
  await mongoApi.disconnectMongoose();
})();
