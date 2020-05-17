const axios = require('axios'),
  moment = require('moment'),
  _ = require('lodash'),
  { TDA_consumerKey } = require('./helpers/constants'),
  { sleep } = require('./helpers/miscMethods'),
  path = require('path'),
  mongoApi = require('./helpers/mongoApi'),
  Candle = require('./models/candle'),
  fs = require('fs');

const getHistoricalDataForSymbol = async (symbol, startDate, endDate) => {
  try {
    const mStart = moment
      .utc(`${startDate} 18:00`, 'YYYY-MM-DD HH:mm')
      .valueOf();
    const mEnd = moment.utc(`${endDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();

    const url = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?apikey=${TDA_consumerKey}&periodType=year&period=2&frequencyType=daily&startDate=${mStart}&endDate=${mEnd}`;

    let res;
    try {
      res = await axios.get(url);
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
    if (candles.length === 0) {
      return {};
    }
    for (const candle of candles) {
      candle.date = moment(candle.datetime).format('YYYY-MM-DD');
      candle.symbol = symbol;
      delete candle.datetime;
    }
    return candles;
  } catch (err) {
    debugger;
  }
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
