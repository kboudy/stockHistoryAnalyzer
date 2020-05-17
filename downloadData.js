const axios = require('axios'),
  moment = require('moment'),
  _ = require('lodash'),
  { TDA_consumerKey, stockDataDir } = require('./helpers/constants'),
  path = require('path'),
  fs = require('fs');

const getHistoricalDataForSymbol = async (symbol, startDate, endDate) => {
  try {
    const mStart = moment
      .utc(`${startDate} 18:00`, 'YYYY-MM-DD HH:mm')
      .valueOf();
    const mEnd = moment.utc(`${endDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();

    const url = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?apikey=${TDA_consumerKey}&periodType=year&period=2&frequencyType=daily&startDate=${mStart}&endDate=${mEnd}`;

    const res = await axios.get(url);
    const { candles } = res.data;

    if (candles.length === 0) {
      return {};
    }
    const historicalDataByDate = candles.reduce((mainObj, item) => {
      const cd = { ...item };
      delete cd.datetime;
      const date = moment(item.datetime).format('YYYY-MM-DD');
      mainObj[date] = cd;
      return mainObj;
    }, {});

    return historicalDataByDate;
  } catch (err) {
    debugger;
  }
};

const downloadAndSaveMultipleSymbolHistory = async (symbols) => {
  for (const symbol of symbols) {
    const jsonPath = path.join(stockDataDir, `${symbol}.json`);

    let allHistoricalData = {};
    let existingMaxDate = null;
    let currentYear = 1960;
    if (fs.existsSync(jsonPath)) {
      allHistoricalData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const dates = Object.keys(allHistoricalData);
      existingMaxDate = _.orderBy(dates, (d) => d)[dates.length - 1];
      currentYear = parseInt(existingMaxDate.split('-')[0]);
    }
    const yesterday = moment().add(-1, 'days').format('YYYY-MM-DD');
    while (true) {
      let startDate = existingMaxDate
        ? existingMaxDate
        : `${currentYear}-01-01`;
      existingMaxDate = null;
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
      allHistoricalData = { ...allHistoricalData, ...historicalData };
      if (endDate === yesterday) {
        break;
      }
      currentYear += 5;
    }
    fs.writeFileSync(jsonPath, JSON.stringify(allHistoricalData), 'utf8');
  }
};

(async () => {
  await downloadAndSaveMultipleSymbolHistory([
    'AAPL',
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
})();
