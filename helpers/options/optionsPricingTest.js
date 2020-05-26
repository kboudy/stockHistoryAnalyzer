const axios = require('axios'),
  bs = require('black-scholes'),
  mongoApi = require('../mongoApi'),
  chalk = require('chalk'),
  { calculateHV } = require('./historicVolatility'),
  { loadHistoricalDataForSymbol } = require('../symbolData'),
  { getOptionChainData } = require('../../helpers/tdaCommunication');

const symbol = 'SLV';

// "risk-free one-year Treasury rates"
// https://www.treasury.gov/resource-center/data-chart-center/interest-rates/pages/textview.aspx?data=yield
const annualInterestRate = 0.17;

(async () => {
  await mongoApi.connectMongoose();
  const candles = await loadHistoricalDataForSymbol(symbol);
  const currentPrice = candles[candles.length - 1].close;
  const hv20 = calculateHV(candles, 20);

  console.log(
    chalk.blueBright(`Theoretical options pricing test for ${symbol}`)
  );

  const optionChainData = await getOptionChainData(
    symbol,
    false,
    Math.round(currentPrice),
    10,
    null
  );
  for (const dateKey in optionChainData.callExpDateMap) {
    const expirationDate = dateKey.slice(0, 10);
    console.log(chalk.white(`  - Expiration: ${expirationDate}`));

    for (const strikePrice in optionChainData.callExpDateMap[dateKey]) {
      const contractData =
        optionChainData.callExpDateMap[dateKey][strikePrice][0];
      const theoreticalOptionValue = bs.blackScholes(
        optionChainData.underlyingPrice,
        parseFloat(strikePrice),
        parseFloat(contractData.daysToExpiration) / 365,
        hv20 / 100,
        annualInterestRate,
        'call'
      );
      const errorPercent =
        ((contractData.mark - theoreticalOptionValue) * 100) /
        contractData.mark;

      const strStrike = chalk.cyan(`    - Strike: ${strikePrice}, `);
      const strActual = chalk.green(
        `Actual: ${contractData.mark.toFixed(2)}, `
      );
      const strCalculated = chalk.yellowBright(
        `Calculated: ${theoreticalOptionValue.toFixed(2)}, `
      );
      const strError = chalk.red(`Error: ${errorPercent.toFixed(1)}, `);

      console.log(`${strStrike}${strActual}${strCalculated}${strError}`);
    }
  }
  await mongoApi.disconnectMongoose();
})();
