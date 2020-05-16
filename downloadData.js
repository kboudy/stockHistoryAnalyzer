const axios = require('axios'),
  moment = require('moment'),
  { consumerKey, stockDataDir } = require('./constants'),
  path = require('path'),
  fs = require('fs');

const getHistoricalDataForSymbol = async (symbol, startDate, endDate) => {
  try {
    const mStart = moment
      .utc(`${startDate} 18:00`, 'YYYY-MM-DD HH:mm')
      .valueOf();
    const mEnd = moment.utc(`${endDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();

    const url = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?apikey=${consumerKey}&periodType=year&period=2&frequencyType=daily&startDate=${mStart}&endDate=${mEnd}`;

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
    let currentYear = 1960;
    const yesterday = moment().add(-1, 'days').format('YYYY-MM-DD');
    let allHistoricalData = {};
    while (true) {
      const startDate = `${currentYear}-01-01`;
      let endDate = `${currentYear + 4}-01-01`;
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
    fs.writeFileSync(
      path.join(stockDataDir, `${symbol}.json`),
      JSON.stringify(allHistoricalData),
      'utf8'
    );
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
    'SNRE',
    'SPY',
    'TSLA',
  ]);
})();
