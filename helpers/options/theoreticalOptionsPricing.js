const axios = require('axios'),
  bs = require('black-scholes'),
  mongoApi = require('../mongoApi'),
  chalk = require('chalk'),
  { calculateHV } = require('./historicVolatility'),
  { loadHistoricalDataForSymbol } = require('../symbolData'),
  { getOptionChainData } = require('../tdaCommunication');

// "risk-free one-year Treasury rates"
// https://www.treasury.gov/resource-center/data-chart-center/interest-rates/pages/textview.aspx?data=yield
const annualInterestRate = 0.17;

// add fake candles to the end, moving toward the sell price, to estimate hv
const getProjectedHV = (candles, hvLength, daysHeld, sellPrice) => {
  const projectedCandles = [...candles];
  const lastCandle = candles[candles.length - 1];
  let currentCloseValue = lastCandle.close;
  const stepIncrement = (sellPrice - lastCandle.close) / daysHeld;
  for (const i = 0; i < daysHeld; i++) {
    currentCloseValue = currentCloseValue + stepIncrement;
    projectedCandles.push({ close: currentCloseValue }); // the hv calc only needs a "close value"
  }
  return calculateHV(projectedCandles, hvLength);
};

// runs the following simulation:
// - buy every available option, and see what its value would be if it were held for (daysHeld) and then sold
// - every profit/loss from the current pattern's historical results
// - returns the results, sorted by avg profitability, descending
// - it does this by:
//   - projecting/simulating historical volatility
//   - plugging all factors into black/scholes to get estimated option price at sale date/price
const rateOptionContractsByHistoricProfitLoss = async (
  symbol,
  daysHeld,
  historicalProfitLosses
) => {
  const candles = await loadHistoricalDataForSymbol(symbol);
  const currentPrice = candles[candles.length - 1].close;
  const buyPrice = currentPrice;
  const currentHV = calculateHV(candles, 20);

  const results = [];
  const optionChainData = await getOptionChainData(
    symbol,
    false,
    Math.round(currentPrice),
    20,
    null
  );
  // loop through each historic P/L
  // see the option's estimated price change from purchase to sell date
  // log the results
  for (const dateKey in optionChainData.callExpDateMap) {
    const expirationDate = dateKey.slice(0, 10);
    for (const strikePrice in optionChainData.callExpDateMap[dateKey]) {
      if (contractData.daysToExpiration < daysHeld) {
        // we don't want the contract expiring during the trade
        continue;
      }
      const contractData =
        optionChainData.callExpDateMap[dateKey][strikePrice][0];

      const optionValueAtPurchaseDate = bs.blackScholes(
        buyPrice,
        parseFloat(strikePrice),
        parseFloat(contractData.daysToExpiration) / 365,
        currentHV / 100,
        annualInterestRate,
        'call'
      );

      const thisLoopResults = [];
      for (const historicalPL of historicalProfitLosses) {
        // note I'm assuming the historicalPL comes as "90" and not ".9" for 90%
        const sellPrice = (1 + historicalPL / 100) * buyPrice;
        const projectedHV = getProjectedHV(candles, 20, daysHeld, sellPrice);

        const optionValueAtSaleDate = bs.blackScholes(
          sellPrice,
          parseFloat(strikePrice),
          parseFloat(contractData.daysToExpiration - daysHeld) / 365,
          projectedHV / 100,
          annualInterestRate,
          'call'
        );
        const optionProfitLoss =
          Math.round(
            (1000 * (optionValueAtSaleDate - optionValueAtPurchaseDate)) /
              optionValueAtPurchaseDate
          ) / 10;
        thisLoopResults.push(optionProfitLoss);
      }

      // now get the average of the individual profit/losses
      results.push({
        expirationDate,
        strikePrice,
        daysToExpiration: contractData.daysToExpiration,
        avgProfitLoss: _.mean(thisLoopResults),
      });
    }
  }
  return _.orderBy(results, (r) => -r.avgProfitLoss);
};

(async () => {
  await mongoApi.connectMongoose();
  await rateOptionContractsByHistoricProfitLoss('SLV', 1, []);
  await mongoApi.disconnectMongoose();
})();
