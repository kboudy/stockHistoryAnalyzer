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
  // third and final pass: populate actual option prices:

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
