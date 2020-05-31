const _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoApi = require('../helpers/mongoApi'),
  bs = require('black-scholes'),
  {
    rateOptionContractsByHistoricProfitLoss,
  } = require('../helpers/options/theoreticalOptionsPricing'),
  { loadHistoricalDataForSymbol } = require('../helpers/symbolData'),
  { getMostRecentEquityTradingDays } = require('../helpers/tdaCommunication'),
  { calculateHV } = require('../helpers/options/historicVolatility'),
  { getOptionChainData } = require('../helpers/tdaCommunication'),
  { annualInterestRate } = require('../helpers/constants'),
  Candle = require('../models/candle'),
  CurrentDayEvaluationJobRun = require('../models/currentDayEvaluationJobRun'),
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

    if (pt.sellDate && !sellPrice_underlying) {
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

const setActualOptionPrice_ifDateIsCurrent = async (
  pt,
  isBuyField,
  mostRecentTradingDay,
  today,
  isAfter5PM
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
      (mostRecentTradingDay === today && isAfter5PM))
  ) {
    const strOptionExpiration = moment
      .utc(pt.optionExpiration)
      .format('YYYY-MM-DD');
    if (pt.optionStrike) {
      const optionChainData = await getOptionChainData(
        pt.symbol,
        pt.optionIsPut,
        parseInt(pt.optionStrike),
        null,
        strOptionExpiration
      );

      for (const expDate in optionChainData.callExpDateMap) {
        for (const strike in optionChainData.callExpDateMap[expDate]) {
          // there should only be one contract here.  just using loops to get the first keys
          const sellPriceOptionActual =
            optionChainData.callExpDateMap[expDate][strike][0].mark;

          const field = isBuyField
            ? 'buyPrice_option_actual'
            : 'sellPrice_option_actual';
          await PaperTrade.updateOne(
            { _id: pt._id },
            {
              [field]: sellPriceOptionActual,
            }
          );
        }
      }
    }
  }
};

const optionSetHasMatch = (filterSet, option) => {
  console.log(chalk.red('still need to test optionSetHasMatch method'));
  const matches =
    filterSet.filter(
      (f) =>
        f.expirationDate === option.expirationDate &&
        f.strike === option.strike &&
        f.isPut === option.isPut
    ).length > 0;
  console.log(chalk.red(`match count: ${matches.length}`));

  return matches;
};

const setOptionChains_ifDateIsCurrent = async (
  pt,
  isBuyField,
  mostRecentTradingDay,
  today,
  isAfter5PM,
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
      (mostRecentTradingDay === today && isAfter5PM))
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

const populateOptionPrices = async () => {
  // first pass: populate:
  //     - buyPrice_option_theoretical
  //     - optionStrike
  //     - optionExpiration
  //     - daysToExpiration_atPurchase
  const tradesThatNeedTheoreticalBuyPrices = await PaperTrade.find({
    buyPrice_option_theoretical: null,
  });
  for (const pt of tradesThatNeedTheoreticalBuyPrices) {
    // Load the currentDayJobEvaluationRun associated with this paperTrade, and get the avgPL from each numberOfBar, and include them here
    if (pt.currentDayEvaluationJobRun && !pt.buyPrice_option_theoretical) {
      const cdejr = await CurrentDayEvaluationJobRun.findById(
        pt.currentDayEvaluationJobRun
      );
      const cdejrSymbol = cdejr.results[pt.symbol];
      const avgPLs = [];
      for (const numberOfBars in cdejrSymbol) {
        avgPLs.push(
          cdejrSymbol[numberOfBars].avg_profitLossPercent_atBarX[pt.heldDays]
        );
      }
      const ratedContracts = await rateOptionContractsByHistoricProfitLoss(
        pt.symbol,
        pt.heldDays,
        avgPLs
      );
      if (ratedContracts.length === 0) {
        continue;
      }

      const bestRatedContract = ratedContracts[0];
      await PaperTrade.updateOne(
        { _id: pt._id },
        {
          buyPrice_option_theoretical:
            Math.round(bestRatedContract.optionValueAtPurchaseDate * 100) / 100,
          optionExpiration: moment
            .utc(bestRatedContract.expirationDate)
            .toDate(),
          optionStrike: parseFloat(bestRatedContract.strikePrice),
          daysToExpiration_atPurchase: parseInt(
            bestRatedContract.daysToExpiration
          ),
        }
      );
    }
  }

  const currentEasternTime = moment().tz('America/New_York');
  const today = currentEasternTime.format('YYYY-MM-DD');
  const isAfter5PM = currentEasternTime.hour() >= 17;
  const mostRecentTradingDays = await getMostRecentEquityTradingDays();
  const mostRecentTradingDay =
    mostRecentTradingDays[mostRecentTradingDays.length - 1];

  //-----------------------------------------------------------------
  // second pass: populate:
  //     - sellPrice_option_theoretical
  const tradesThatNeedTheoreticalSellPrices = await PaperTrade.find({
    sellPrice_option_theoretical: null,
  });
  for (const pt of tradesThatNeedTheoreticalSellPrices) {
    const strSellDate = moment(pt.sellDate).format('YYYY-MM-DD');
    if (
      pt.optionStrike &&
      pt.daysToExpiration_atPurchase &&
      (strSellDate < mostRecentTradingDay ||
        (strSellDate === mostRecentTradingDay && isAfter5PM))
    ) {
      const histData = await loadHistoricalDataForSymbol(pt.symbol);
      const sellDateCandle = histData.filter((c) => c.date === strSellDate);
      if (sellDateCandle.length > 0) {
        const histDataCropped = histData.filter((hd) => hd.date <= strSellDate);

        const daysToExpiration_atSell =
          (parseFloat(pt.daysToExpiration_atPurchase) - pt.heldDays) / 365;
        if (daysToExpiration_atSell < 0) {
          // should never happen
          continue;
        }

        const optionValueAtSellDate =
          Math.round(
            100 *
              bs.blackScholes(
                sellDateCandle[0].close,
                pt.optionStrike,
                daysToExpiration_atSell,
                calculateHV(histDataCropped, 20) / 100,
                annualInterestRate,
                'call'
              )
          ) / 100;

        await PaperTrade.updateOne(
          { _id: pt._id },
          {
            sellPrice_option_theoretical: optionValueAtSellDate,
          }
        );
      }
    }
  }

  //-----------------------------------------------------------------
  // third pass: populate actual option prices:

  const tradesThatNeedActualPrices = await PaperTrade.find({
    $or: [{ sellPrice_option_actual: null }, { buyPrice_option_actual: null }],
  });

  for (const pt of tradesThatNeedActualPrices) {
    if (!pt.buyPrice_option_actual) {
      await setActualOptionPrice_ifDateIsCurrent(
        pt,
        true,
        mostRecentTradingDay,
        today,
        isAfter5PM
      );
    }
    if (!pt.sellPrice_option_actual) {
      await setActualOptionPrice_ifDateIsCurrent(
        pt,
        false,
        mostRecentTradingDay,
        today,
        isAfter5PM
      );
    }
  }

  //-----------------------------------------------------------------
  // fourth pass: populate the top 100 option buy option chains:

  const tradesThatNeedOptionBuyChains = await PaperTrade.find({
    buyDate_option_chains: null,
  });

  for (const pt of tradesThatNeedOptionBuyChains) {
    await setOptionChains_ifDateIsCurrent(
      pt,
      true,
      mostRecentTradingDay,
      today,
      isAfter5PM,
      null
    );
  }

  //-----------------------------------------------------------------
  // fifth & final pass: populate the top 100 option sell chains (or just match the buy chains, if they exist)

  const tradesThatNeedOptionSellChains = await PaperTrade.find({
    sellDate_option_chains: null,
  });

  for (const pt of tradesThatNeedOptionSellChains) {
    await setOptionChains_ifDateIsCurrent(
      pt,
      false,
      mostRecentTradingDay,
      today,
      isAfter5PM,
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
  await mongoApi.connectMongoose();
  //  await populateSellDates();
  // await populateUnderlyingPrices();
  await populateOptionPrices();
  await mongoApi.disconnectMongoose();
})();
