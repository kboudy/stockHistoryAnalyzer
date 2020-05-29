const axios = require('axios'),
  { TDA_consumerKey, TDA_refreshToken } = require('./constants'),
  qs = require('qs'),
  chalk = require('chalk'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  { isNullOrUndefined, sleep } = require('./commonMethods'),
  opn = require('opn');

let current_access_token = null;
let lastAuthenticated = null;
let requestDateTimes_inLast5Seconds = [];
let requestDateTimes_inLast60Seconds = [];
let requestDateTimes = [];
const delayIfNecessary_forTDALimit = async (asyncMethod) => {
  let res;
  let retryCount = 4;
  while (retryCount > 0) {
    try {
      res = await asyncMethod();

      retryCount = 0;
      // attempt to avoid a 429 "too many requests per second" from TDAmeritrade
      const currentDateTime = new Date().getTime();
      requestDateTimes.push(currentDateTime);
      requestDateTimes_inLast5Seconds = requestDateTimes.filter(
        (d) => d >= currentDateTime - 5000
      );
      requestDateTimes_inLast60Seconds = requestDateTimes.filter(
        (d) => d >= currentDateTime - 60000
      );
      requestDateTimes = requestDateTimes.filter(
        (d) => d >= currentDateTime - 90000
      );
      const throttle = requestDateTimes_inLast5Seconds.length > 10;
      // abandoning the conditional throttle for now - was maxxing out on 429's (too many requests)
      const sleepTime = 550;
      await sleep(sleepTime);
      return res;
    } catch (err) {
      retryCount--;
      if (retryCount > 0) {
        if (err.response && err.response.status === 429) {
          console.log(
            chalk.red(
              `Error 429 - too many requests - waiting 5 seconds & retrying.  request count in last 5 seconds: ${requestDateTimes_inLast5Seconds.length}, 60 seconds: ${requestDateTimes_inLast60Seconds.length}`
            )
          );
        } else if (err.response && err.response.status === 404) {
          console.log(chalk.red(`Error 404 - retrying`));
        } else {
          console.log(chalk.red(`Error - retrying: ${err.message}`));
        }
        await sleep(5000);
      } else {
        throw err;
      }
    }
  }
};

exports.getMostRecentEquityTradingDay = async () => {
  let oneWeekAgo = moment().add(-7, 'days').format('YYYY-MM-DD');
  let today = moment().format('YYYY-MM-DD');

  const candles = await downloadHistoricalEquityData('SPY', oneWeekAgo, today);
  const maxDate = _.max(
    candles.filter((c) => c.date < today).map((c) => c.date)
  );
  return maxDate;
};

const authenticateIfNecessary = async () => {
  const currentDate = moment();
  if (
    !current_access_token ||
    !lastAuthenticated ||
    moment.duration(currentDate.diff(lastAuthenticated)).asMinutes() > 5
  ) {
    await authenticate();
  }
};

const downloadHistoricalEquityData = async (symbol, startDate, endDate) => {
  await authenticateIfNecessary();
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
exports.downloadHistoricalEquityData = downloadHistoricalEquityData;

exports.downloadBulkCurrentEquityData = async (symbols) => {
  await authenticateIfNecessary();

  // NOTE: since bulk-downloaded candles are "current day", we'll get rid of them before assessing which to download
  // unless it's after market close (5PM or later), then we'll let them live in the db permanently
  const currentEasternTime = moment().tz('America/New_York');
  const fromBulkDownload = currentEasternTime.hour() < 17;

  const symbolChunks = [];
  const chunkSize = 300;
  let i, j;
  for (i = 0, j = symbols.length; i < j; i += chunkSize) {
    symbolChunks.push(symbols.slice(i, i + chunkSize));
  }
  const candles = [];
  const today = moment().format('YYYY-MM-DD');
  for (const symbolChunk of symbolChunks) {
    const url = `https://api.tdameritrade.com/v1/marketdata/quotes?apikey=${TDA_consumerKey}&symbol=${symbolChunk.join(
      ','
    )}`;

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
      candle.fromBulkDownload = fromBulkDownload;
      candle.date = candleDate;
      candle.symbol = symbol;
      candle.open = c.openPrice;
      candle.mark = c.mark; // not stored in db, but used for live calculations
      candle.high = c.highPrice;
      candle.low = c.lowPrice;
      candle.close = c.closePrice;
      candle.volume = c.totalVolume;
      candles.push(candle);
    }
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
  await authenticateIfNecessary();

  let url = `https://api.tdameritrade.com/v1/marketdata/chains?apikey=${TDA_consumerKey}&symbol=${symbol}&contractType=${
    isPut ? 'PUT' : 'CALL'
  }&includeQuotes=TRUE&optionType=ALL&strategy=SINGLE`;
  if (!isNullOrUndefined(strike)) {
    url = `${url}&strike=${strike}`;
  }
  if (!isNullOrUndefined(strikeCount)) {
    url = `${url}&strikeCount=${strikeCount}`;
  }
  if (!isNullOrUndefined(date)) {
    url = `${url}&fromDate=${date}&toDate=${date}`;
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
  lastAuthenticated = moment();
};
