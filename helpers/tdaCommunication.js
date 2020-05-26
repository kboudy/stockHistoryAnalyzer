const axios = require('axios'),
{ authCode, consumerKey, TDA_refreshToken } = require("./constants"),
  const axios = require("axios"),
  qs = require("qs"),
  opn = require("opn");

let requestDateTimes_inLastMinute = [];
exports.downloadEquityData = async (symbol, startDate, endDate) => {
  const mStart = moment.utc(`${startDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();
  const mEnd = moment.utc(`${endDate} 18:00`, 'YYYY-MM-DD HH:mm').valueOf();
  const url = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?apikey=${consumerKey}&periodType=year&period=2&frequencyType=daily&startDate=${mStart}&endDate=${mEnd}`;

  let res;
  let retryCount = 3;
  while (retryCount > 0) {
    try {
      const instance = axios.create({
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });
      res = await instance.get(url);
      retryCount = 0;

      // attempt to avoid a 429 "too many requests per second" from TDAmeritrade
      const currentDateTime = new Date().getTime();
      requestDateTimes_inLastMinute = requestDateTimes_inLastMinute.filter(
        (d) => d >= currentDateTime - 60000
      );
      requestDateTimes_inLastMinute.push(currentDateTime);
      const throttle = requestDateTimes_inLastMinute.length > 95;
      const sleepTime = throttle ? 1000 : 50;
      await sleep(sleepTime);
    } catch (err) {
      retryCount--;
      if (retryCount > 0 && err.response.status === 429) {
        console.log(
          chalk.red(
            `Error 429 - too many requests - waiting 5 seconds & retrying.  request count in last minute: ${requestDateTimes_inLastMinute.length}`
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

  const { candles } = res.data;
  for (const candle of candles) {
    candle.date = moment(candle.datetime).format('YYYY-MM-DD');
    candle.symbol = symbol;
    delete candle.datetime;
  }
  return _.orderBy(candles, (c) => c.date);
};

let requestDateTimes_inLastMinute = [];
exports.getOptionChainData = async (
  symbol,
  isPut,
  strike,
  strikeCount,
  date
) => {
  let urlQuery = `https://api.tdameritrade.com/v1/marketdata/chains?apikey=${consumerKey}&symbol=${symbol}&contractType=${
    isPut ? 'PUT' : 'CALL'
  }&includeQuotes=TRUE&strike=${strike}&optionType=ALL&strategy=SINGLE&strikeCount=${strikeCount}`;
  if (date) {
    urlQuery = `${urlQuery}&fromDate=${date}&toDate=${date}`;
  }

  let res;
  let retryCount = 3;
  while (retryCount > 0) {
    try {
      res = await axios.get(urlQuery);
      retryCount = 0;

      // attempt to avoid a 429 "too many requests per second" from TDAmeritrade
      const currentDateTime = new Date().getTime();
      requestDateTimes_inLastMinute = requestDateTimes_inLastMinute.filter(
        (d) => d >= currentDateTime - 60000
      );
      requestDateTimes_inLastMinute.push(currentDateTime);
      const throttle = requestDateTimes_inLastMinute.length > 95;
      const sleepTime = throttle ? 2000 : 50;
      await sleep(sleepTime);
    } catch (err) {
      retryCount--;
      if (retryCount > 0 && err.response.status === 429) {
        console.log(
          chalk.red(
            `Error 429 - too many requests - waiting 5 seconds & retrying.  request count in last minute: ${requestDateTimes_inLastMinute.length}`
          )
        );
        await sleep(5000);
      }
    }
  }

  return res.data;
};

const getAuthCode = async () => {
  // opens a browser, requests authentication, then you'll see the auth code in the url
  opn(
    `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=https://127.0.0.1&client_id=${consumerKey}%40AMER.OAUTHAP`
  );
};
exports.getAuthCode = getAuthCode;

// you can use request this once (then you'll have to use getAuthCode & verify with the browser again)
const getAccessToken_fromAuthCode = async () => {
  try {
    const data = {
      grant_type: "authorization_code",
      refresh_token: null,
      access_type: "offline",
      code: decodeURIComponent(authCode),
      client_id: consumerKey,
      redirect_uri: "https://127.0.0.1",
    };

    const options = {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: qs.stringify(data),
      url: "https://api.tdameritrade.com/v1/oauth2/token",
    };

    const res = await axios(options);
  } catch (err) {}
};
exports.getAccessToken = getAccessToken_fromAuthCode;

const getAccessToken_fromRefreshToken = async (refresh_token) => {
  try {
    const data = {
      grant_type: "refresh_token",
      refresh_token,
      client_id: consumerKey,
    };

    const options = {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: qs.stringify(data),
      url: "https://api.tdameritrade.com/v1/oauth2/token",
    };

    const res = await axios(options);
    return res.data.access_token;
  } catch (err) {}
};
exports.getAccessToken = getAccessToken_fromAuthCode;
