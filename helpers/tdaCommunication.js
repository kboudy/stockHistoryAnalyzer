const axios = require('axios'),
  { TDA_authCode, TDA_consumerKey, TDA_refreshToken } = require('./constants'),
  qs = require('qs'),
  chalk = require('chalk'),
  _ = require('lodash'),
  moment = require('moment'),
  { sleep } = require('./commonMethods'),
  opn = require('opn');

let current_access_token = null;

let requestDateTimes_inLast5Seconds = [];
const delayIfNecessary_forTDALimit = async (asyncMethod) => {
  let res;
  let retryCount = 3;
  while (retryCount > 0) {
    try {
      res = await asyncMethod();

      retryCount = 0;
      // attempt to avoid a 429 "too many requests per second" from TDAmeritrade
      const currentDateTime = new Date().getTime();
      requestDateTimes_inLast5Seconds = requestDateTimes_inLast5Seconds.filter(
        (d) => d >= currentDateTime - 5000
      );
      requestDateTimes_inLast5Seconds.push(currentDateTime);
      const throttle = requestDateTimes_inLast5Seconds.length > 10;
      const sleepTime = throttle ? 600 : 100;
      await sleep(sleepTime);
      return res;
    } catch (err) {
      retryCount--;
      debugger;
      if (retryCount > 0 && err.response.status === 429) {
        console.log(
          chalk.red(
            `Error 429 - too many requests - waiting 5 seconds & retrying.  request count in last 5 seconds: ${requestDateTimes_inLast5Seconds.length}`
          )
        );
        await sleep(5000);
      } else {
        // forgive the error if the start & end dates are the same
        if (startDate !== endDate) {
          throw err;
        } else {
          return [];
        }
      }
    }
  }
};

exports.downloadHistoricalEquityData = async (symbol, startDate, endDate) => {
  if (!current_access_token) {
    await authenticate();
  }
  const mStart = moment.utc(`${startDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();
  const mEnd = moment.utc(`${endDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();
  const url = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?apikey=${TDA_consumerKey}&periodType=year&period=2&frequencyType=daily&startDate=${mStart}&endDate=${mEnd}`;

  const options = {
    method: 'GET',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${current_access_token}`,
    },
    url,
  };

  res = await delayIfNecessary_forTDALimit(async () => {
    return await axios(options);
  });

  const { candles } = res.data;
  for (const candle of candles) {
    candle.created = moment.utc();
    candle.fromBulkDownload = false;
    candle.date = moment(candle.datetime).format('YYYY-MM-DD');
    candle.symbol = symbol;
    delete candle.datetime;
  }
  return _.orderBy(candles, (c) => c.date);
};

exports.downloadBulkCurrentEquityData = async (symbols) => {
  if (!current_access_token) {
    await authenticate();
  }
  const url = `https://api.tdameritrade.com/v1/marketdata/quotes?apikey=${TDA_consumerKey}&symbol=${symbols.join(
    ','
  )}`;
  const today = moment().format('YYYY-MM-DD');

  const options = {
    method: 'GET',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${current_access_token}`,
    },
    url,
  };

  res = await delayIfNecessary_forTDALimit(async () => {
    return await axios(options);
  });

  const candles = [];
  for (const symbol in res.data) {
    const c = res.data[symbol];
    const candleDate = moment(c.regularMarketTradeTimeInLong).format(
      'YYYY-MM-DD'
    );
    if (candleDate !== today) {
      continue;
    }
    const candle = {};
    candle.created = moment.utc();
    candle.fromBulkDownload = true;
    candle.date = candleDate;
    candle.symbol = symbol;
    candle.open = c.openPrice;
    candle.high = c.highPrice;
    candle.low = c.lowPrice;
    candle.close = c.closePrice;
    candle.volume = c.totalVolume;
    candles.push(candle);
  }
  return _.orderBy(candles, (c) => c.date);
};

exports.getOptionChainData = async (
  symbol,
  isPut,
  strike,
  strikeCount,
  date
) => {
  if (!current_access_token) {
    await authenticate();
  }
  let url = `https://api.tdameritrade.com/v1/marketdata/chains?apikey=${TDA_consumerKey}&symbol=${symbol}&contractType=${
    isPut ? 'PUT' : 'CALL'
  }&includeQuotes=TRUE&strike=${strike}&optionType=ALL&strategy=SINGLE&strikeCount=${strikeCount}`;
  if (date) {
    urlQuery = `${urlQuery}&fromDate=${date}&toDate=${date}`;
  }

  const options = {
    method: 'GET',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${current_access_token}`,
    },
    url,
  };

  res = await delayIfNecessary_forTDALimit(async () => {
    return await axios(options);
  });

  return res.data;
};

// use this if you need to generate a new auth token (in theory, you shouldn't - just need to make a request within 90 days)
const getAuthCode = async () => {
  // opens a browser, requests authentication, then you'll see the auth code in the url
  opn(
    `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=https://127.0.0.1&client_id=${TDA_consumerKey}%40AMER.OAUTHAP`
  );
};
exports.getAuthCode = getAuthCode;

const getAccessToken_fromRefreshToken = async () => {
  const data = {
    grant_type: 'refresh_token',
    refresh_token: TDA_refreshToken,
    client_id: TDA_consumerKey,
  };
  try {
    const options = {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: qs.stringify(data),
      url: 'https://api.tdameritrade.com/v1/oauth2/token',
    };

    const res = await axios(options);
    return res.data.access_token;
  } catch (err) {
    debugger;
  }
};
exports.getAccessToken = getAccessToken_fromRefreshToken;

// this is called internally the first time a request is made
// (uses a refresh token to get & store-in-memory)
const authenticate = async () => {
  current_access_token = await getAccessToken_fromRefreshToken();
};
