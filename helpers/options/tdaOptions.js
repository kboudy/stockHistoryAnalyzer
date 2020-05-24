const axios = require('axios'),
  { TDA_consumerKey } = require('../constants');

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
  const res = await axios.get(urlQuery);
  return res.data;
};
