const axios = require('axios'),
  { TDA_consumerKey, configDir } = require('./constants'),
  qs = require('qs'),
  chalk = require('chalk'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  { Builder } = require('selenium-webdriver'),
  fs = require('fs'),
  path = require('path'),
  chrome = require('selenium-webdriver/chrome'),
  chromedriver = require('chromedriver'),
  { isNullOrUndefined, sleep } = require('./commonMethods');

let current_access_token = null;
let lastAuthenticated = null;
let requestDateTimes_inLast5Seconds = [];
let requestDateTimes_inLast60Seconds = [];
let requestDateTimes = [];

const tdaConfigFilepath = path.join(configDir, 'tdaConfig.json');
if (!fs.existsSync(tdaConfigFilepath)) {
  console.log(
    chalk.red(
      `Expected the file [${tdaConfigFilepath}] to exist.  Run "node primaryModules/authenticateTDA.js" to generate it`
    )
  );
  process.exit(1);
}
const TDA_refreshToken = JSON.parse(fs.readFileSync(tdaConfigFilepath))
  .refresh_token;

const delayIfNecessary_forTDALimit = async (asyncMethod) => {
  let res;
  let retryCount = 4;
  while (retryCount > 0) {
    try {
      res = await asyncMethod();
      >
};

exports.getMostRecentEquityTradingDays = async () => {
  let oneWeekAgo = moment().add(-10, 'days').format('YYYY-MM-DD');
  let today = moment().format('YYYY-MM-DD');

  const candles = await downloadHistoricalEquityData('SPY', oneWeekAgo, today);
  return _.orderBy(
    candles.map((c) => c.date),
    (d) => d
  );
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
    candle.settled = true;
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
  const isAfter4PM = currentEasternTime.hour() >= 16;

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
      const candle = {};
      candle.created = moment.utc();
      candle.settled = isAfter4PM || candleDate !== today;
      candle.date = candleDate;
      candle.symbol = symbol;
      candle.open = c.openPrice;
      candle.high = c.highPrice;
      candle.low = c.lowPrice;
      candle.close = c.regularMarketLastPrice; // intraday, regularMarketLastPrice is the live price.  After 4pm, it's the close (i.e., perfect)
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
  if (strike && strikeCount) {
    throw 'you should only supply strike or strikeCount, not both';
  }
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
exports.getAuthCode = async () => {
  let code, driver;
  // opens a browser, requests authentication, then you'll see the auth code in the url
  try {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.get(
      `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=https://127.0.0.1&client_id=${TDA_consumerKey}%40AMER.OAUTHAP`
    );
    let currentUrl = '';
    while (!currentUrl.includes('?code=') && !currentUrl.includes('&code=')) {
      currentUrl = await driver.getCurrentUrl();
      await sleep(500);
    }
    code = currentUrl.slice(currentUrl.indexOf('code=') + 5);
    if (code.includes('&')) {
      code = code.split('&')[0];
    }
  } catch (err) {
  } finally {
    await driver.quit();
  }
  return code;
};

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

// you can use request this once (then you'll have to use getAuthCode & verify with the browser again)
exports.getAccessToken_fromAuthCode = async (authCode) => {
  try {
    const data = {
      grant_type: 'authorization_code',
      refresh_token: null,
      access_type: 'offline',
      code: decodeURIComponent(authCode),
      client_id: TDA_consumerKey,
      redirect_uri: 'https://127.0.0.1',
    };

    const options = {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: qs.stringify(data),
      url: 'https://api.tdameritrade.com/v1/oauth2/token',
    };

    const res = await axios(options);
    return res.data;
  } catch (err) {
    debugger;
  }
};

// this is called internally the first time a request is made
// (uses a refresh token to get & store-in-memory)
const authenticate = async () => {
  current_access_token = await getAccessToken_fromRefreshToken();
  lastAuthenticated = moment();
};
