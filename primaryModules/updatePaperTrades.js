const _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoApi = require('../helpers/mongoApi'),
  { loadHistoricalDataForSymbol } = require('../helpers/symbolData'),
  Candle = require('../models/candle'),
  PaperTrade = require('../models/paperTrade');

const fillInPaperTradeSellDates = async () => {
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

const argOptions = {};

const { argv } = require('yargs')
  .alias('help', 'h')
  .version(false)
  .options(argOptions);

(async () => {
  await mongoApi.connectMongoose();
  await fillInPaperTradeSellDates();
  await updatePaperTradePrices();
  await mongoApi.disconnectMongoose();
})();
