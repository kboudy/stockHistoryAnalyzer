const _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoApi = require('../helpers/mongoApi'),
  chalk = require('chalk'),
  bs = require('black-scholes'),
  { loadHistoricalDataForSymbol } = require('../helpers/symbolData'),
  { getMostRecentEquityTradingDays } = require('../helpers/tdaCommunication'),
  { getOptionChainData } = require('../helpers/tdaCommunication'),
  Candle = require('../models/candle'),
  PaperTrade = require('../models/paperTrade');

const populateSellDates = async () => {
  const tradesThatNeedSellDates = await PaperTrade.find({
    $or: [{ sellDate: null }],
  });

  for (const pt of tradesThatNeedSellDates) {
    const histData = await loadHistoricalDataForSymbol(pt.symbol);
    const buyIndex = histData.indexOf(
      histData.filter(
        (d) => d.date === moment(pt.buyDate).format('YYYY-MM-DD')
      )[0]
    );
    const sellIndex = buyIndex + pt.heldDays;
    if (sellIndex < histData.length) {
      const sellDate = moment(
        `${histData[sellIndex].date} 4:00PM`,
        'YYYY-MM-DD h:mmA'
      ).toDate();

      await PaperTrade.updateOne({ _id: pt._id }, { sellDate: sellDate });
    }
  }
};

const populateUnderlyingPrices = async () => {
  const tradesThatNeedPriceUpdates = await PaperTrade.find({
    $or: [{ sellPrice_underlying: null }, { buyPrice_underlying: null }],
  });
  for (const pt of tradesThatNeedPriceUpdates) {
    if (pt.buyDate && !pt.buyPrice_underlying) {
      const strBuyDate = moment(pt.buyDate).format('YYYY-MM-DD');
      const matchingCandle = await Candle.findOne({
        symbol: pt.symbol,
        date: strBuyDate,
      });
      if (matchingCandle && matchingCandle.settled) {
        await PaperTrade.updateOne(
          { _id: pt._id },
          { buyPrice_underlying: parseFloat(matchingCandle.close.toString()) }
        );
      }
    }

    if (pt.sellDate && !pt.sellPrice_underlying) {
      const strSellDate = moment(pt.sellDate).format('YYYY-MM-DD');
      const matchingCandle = await Candle.findOne({
        symbol: pt.symbol,
        date: strSellDate,
      });
      if (matchingCandle && matchingCandle.settled) {
        await PaperTrade.updateOne(
          { _id: pt._id },
          { sellPrice_underlying: parseFloat(matchingCandle.close.toString()) }
        );
      }
    }
  }
};

const optionSetHasMatch = (filterSet, option) => {
  const hasMatches =
    filterSet.filter(
      (f) =>
        f.expirationDate === option.expirationDate &&
        f.strike === option.strike &&
        f.isPut === option.isPut
    ).length > 0;

  return hasMatches;
};

const setOptionChains_ifDateIsCurrent = async (
  pt,
  isBuyField,
  mostRecentTradingDay,
  today,
  isAfter4PM,
  filterSet // list of option chains to match
) => {
  if ((isBuyField && !pt.buyDate) || (!isBuyField && !pt.sellDate)) {
    return;
  }
  const strOptionTradeDate = moment(
    isBuyField ? pt.buyDate : pt.sellDate
  ).format('YYYY-MM-DD');
  if (
    strOptionTradeDate === mostRecentTradingDay &&
    (mostRecentTradingDay < today ||
      (mostRecentTradingDay === today && isAfter4PM))
  ) {
    const optionChainData = await getOptionChainData(
      pt.symbol,
      pt.optionIsPut,
      null,
      100,
      null
    );

    const allOptionChains = [];
    for (const expDate in optionChainData.callExpDateMap) {
      for (const strike in optionChainData.callExpDateMap[expDate]) {
        const contract = optionChainData.callExpDateMap[expDate][strike][0];
        const strExpDate = expDate.slice(0, 10);
        allOptionChains.push({
          expirationDate: strExpDate,
          strike,
          isPut: contract.putCall.toUpperCase() === 'PUT',
          bid: contract.bid,
          ask: contract.ask,
          mark: contract.mark,
          closePrice: contract.closePrice,
          volatility: contract.volatility,
          delta: contract.delta,
          gamma: contract.gamma,
          theta: contract.theta,
          vega: contract.vega,
          openInterest: contract.openInterest,
          theoreticalOptionValue: contract.theoreticalOptionValue,
          theoreticalVolatility: contract.theoreticalVolatility,
          strikePrice: contract.strikePrice,
          daysToExpiration: contract.daysToExpiration,
        });
      }
    }

    let filtered;
    if (filterSet) {
      const filteredByFilterSet = allOptionChains.filter((o) =>
        optionSetHasMatch(filterSet, o)
      );

      filtered = filteredByFilterSet;
    } else {
      const filteredByOpenInterest = _.take(
        _.orderBy(
          allOptionChains.filter((o) => parseFloat(o.openInterest) > 0),
          (oc) => -parseFloat(oc.openInterest)
        ),
        100
      );
      filtered = filteredByOpenInterest;
    }

    const field = isBuyField
      ? 'buyDate_option_chains'
      : 'sellDate_option_chains';
    await PaperTrade.updateOne(
      { _id: pt._id },
      {
        [field]: filtered,
      }
    );
  }
};

const populateOptionChains = async () => {
  const currentEasternTime = moment().tz('America/New_York');
  const today = currentEasternTime.format('YYYY-MM-DD');
  const isAfter4PM = currentEasternTime.hour() >= 16;
  const mostRecentTradingDays = await getMostRecentEquityTradingDays();
  const mostRecentTradingDay =
    mostRecentTradingDays[mostRecentTradingDays.length - 1];

  //-----------------------------------------------
  // populate the top 100 option buy option chains:

  const tradesThatNeedOptionBuyChains = await PaperTrade.find({
    buyDate_option_chains: null,
  });

  for (const pt of tradesThatNeedOptionBuyChains) {
    await setOptionChains_ifDateIsCurrent(
      pt,
      true,
      mostRecentTradingDay,
      today,
      isAfter4PM,
      null
    );
  }

  //--------------------------------------------------------------------------------------
  // populate the top 100 option sell chains (or just match the buy chains, if they exist)

  const tradesThatNeedOptionSellChains = await PaperTrade.find({
    sellDate_option_chains: null,
  });

  for (const pt of tradesThatNeedOptionSellChains) {
    await setOptionChains_ifDateIsCurrent(
      pt,
      false,
      mostRecentTradingDay,
      today,
      isAfter4PM,
      pt.buyDate_option_chains // we'll use the buyDate_option_chains as the filter set, if it exists
    );
  }
};

const argOptions = {};

const { argv } = require('yargs')
  .alias('help', 'h')
  .version(false)
  .options(argOptions);

(async () => {
  console.log('Updating paper trades...');
  await mongoApi.connectMongoose();
  await populateSellDates();
  await populateUnderlyingPrices();
  await populateOptionChains();
  await mongoApi.disconnectMongoose();
})();
