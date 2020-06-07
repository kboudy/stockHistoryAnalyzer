const _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoApi = require('../helpers/mongoApi'),
  PaperTrade = require('../models/paperTrade'),
  Candle = require('../models/candle');

const STOP_LOSS_ARRAY = [0, 1, 2, 5, 10, 15];
const HELD_DAYS = 1;

const listPaperTrade_avgProfits_byDate = async () => {
  const results = await PaperTrade.aggregate([
    { $match: { heldDays: HELD_DAYS } },
    {
      $group: {
        _id: {
          buyDate: '$buyDate',
        },
      },
    },
  ]);
  const distinctBuyDates = _.orderBy(
    results.map((r) => r._id.buyDate),
    (d) => d
  );
  console.log(`date,spyPL,${STOP_LOSS_ARRAY.join(',')}`);

  const spyCloses = (await Candle.find({ symbol: 'SPY' })).reduce(
    (reduced, currentField) => {
      reduced[currentField.date] = parseFloat(`${currentField.close}`);
      return reduced;
    },
    {}
  );

  const plPerSymbol = {};
  for (const buyDate of distinctBuyDates) {
    const paperTrades = await PaperTrade.find({ buyDate, heldDays: HELD_DAYS });
    const strBuyDate = moment(buyDate).format('YYYY-MM-DD');
    /* 
      if (strBuyDate === '2018-12-17') {
        break;
      }
    */
    let strSellDate;
    const plListByStop = [];
    for (const pt of paperTrades) {
      if (!strSellDate) {
        strSellDate = moment(pt.sellDate).format('YYYY-MM-DD');
      }
      const candlesAfterBuyDate = _.orderBy(
        await Candle.find({
          symbol: pt.symbol,
          date: { $gt: strBuyDate, $lte: strSellDate },
        }),
        (c) => c.date
      );
      const plByStop = {};
      for (const stopLossPercent of STOP_LOSS_ARRAY) {
        const stopPrice =
          pt.buyPrice_underlying -
          pt.buyPrice_underlying * (stopLossPercent / 100);
        let stopLossSellPrice = pt.sellPrice_underlying;
        if (stopLossPercent > 0) {
          for (const c of candlesAfterBuyDate) {
            if (c.open < stopPrice) {
              stopLossSellPrice = c.open;
              break;
            }
            if (c.low < stopPrice) {
              stopLossSellPrice = stopPrice;
              break;
            }
          }
        } else {
          if (!plPerSymbol[pt.symbol]) {
            plPerSymbol[pt.symbol] = [];
          }
          plPerSymbol[pt.symbol].push(
            (100 * (pt.sellPrice_underlying - pt.buyPrice_underlying)) /
              pt.buyPrice_underlying
          );
        }

        plByStop[stopLossPercent] =
          (100 * (stopLossSellPrice - pt.buyPrice_underlying)) /
          pt.buyPrice_underlying;
      }
      plListByStop.push(plByStop);
    }
    const plTotalsByStop = {};
    for (const plByStop of plListByStop) {
      for (const stopLossPercent in plByStop) {
        if (!plTotalsByStop[stopLossPercent]) {
          plTotalsByStop[stopLossPercent] = 0;
        }
        plTotalsByStop[stopLossPercent] += plByStop[stopLossPercent];
      }
    }
    const spyPL =
      Math.round(
        (10000 * (spyCloses[strSellDate] - spyCloses[strBuyDate])) /
          spyCloses[strBuyDate]
      ) / 100;

    let outputLine = `${strSellDate},${spyPL},`;
    const stopLossPercents = Object.keys(plTotalsByStop);
    for (const stopLossPercent of stopLossPercents) {
      const isLast =
        stopLossPercents.indexOf(stopLossPercent) ===
        stopLossPercents.length - 1;
      outputLine += `${
        Math.round(
          (plTotalsByStop[stopLossPercent] / plListByStop.length) * 100
        ) / 100
      }${isLast ? '' : ','}`;
    }
    console.log(outputLine);
  }
  /* 
// to output PL/symbol
for (const symbol in plPerSymbol) {
    console.log(
      `${symbol},${plPerSymbol[symbol].length},${_.mean(
        plPerSymbol[symbol]
      ).toFixed(2)}`
    );
  }
 */
};

(async () => {
  await mongoApi.connectMongoose();
  await listPaperTrade_avgProfits_byDate();
  await mongoApi.disconnectMongoose();
})();
