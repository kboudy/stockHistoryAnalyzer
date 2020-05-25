const axios = require('axios'),
  { TDA_consumerKey } = require('../constants');

let requestDateTimes_inLastMinute = [];
exports.getOptionChainData = async (
  symbol,
  isPut,
  strike,
  strikeCount,
  date
) => {
  let urlQuery = `https://api.tdameritrade.com/v1/marketdata/chains?apikey=${TDA_consumerKey}&symbol=${symbol}&contractType=${
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
