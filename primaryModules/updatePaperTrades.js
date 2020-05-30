const _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoApi = require('../helpers/mongoApi'),
  mongoose = require('mongoose'),
  {
    getAvailableSymbolNames,
    isCrypto,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  Candle = require('../models/candle'),
  downloadBulkCurrentEquityData = require('../helpers/tdaCommunication'),
  PatternStats = require('../models/patternStats'),
  PaperTrade = require('../models/paperTrade'),
  PatternStatsJobRun = require('../models/patternStatsJobRun'),
  TradeSimulationRun = require('../models/tradeSimulationRun');

const updatePaperTradePrices = async () => {
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

const fillInPaperTradeSellDates = async () => {
  const res = await PaperTrade.find({ sellPrice_underlying: null });
  for (const pt of res) {
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

      await PaperTrade.update(
        { _id: pt._id },
        { sellDate: sellDate, sellPrice_underlying: histData[sellIndex].close }
      );
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
  await fillInPaperTradeSellDates();
  await mongoApi.disconnectMongoose();
})();
