// PURPOSE: Look through large list of symbols (obtained by EODData) & query tda for options data.  Record highest open interest contract, if it exists

const _ = require('lodash'),
  mongoApi = require('../helpers/mongoApi'),
  fs = require('fs'),
  { symbolsToDownload } = require('../helpers/constants'),
  { getOptionChainData } = require('../helpers/tdaCommunication');

(async () => {
  await mongoApi.connectMongoose();
  let lastPercentCompleteLogged = 0;
  for (const s of symbolsToDownload) {
    const percentComplete = Math.round(
      (100 * (symbolsToDownload.indexOf(s) + 1)) / symbolsToDownload.length
    );
    if (
      percentComplete - lastPercentCompleteLogged !== 0 &&
      (percentComplete - lastPercentCompleteLogged) % 5 === 0
    ) {
      lastPercentCompleteLogged = percentComplete;
      console.log(`% complete: ${percentComplete}`);
    }
    const res = await getOptionChainData(s, false, null, 1, null);
    if (
      res.status === 'FAILED' ||
      Object.keys(res.callExpDateMap).length === 0
    ) {
      continue;
    }
    let maxOpenInterest = 0;
    for (const date of Object.keys(res.callExpDateMap)) {
      for (const strike of Object.keys(res.callExpDateMap[date])) {
        const thisOpenInterest =
          res.callExpDateMap[date][strike][0].openInterest;
        if (thisOpenInterest > maxOpenInterest) {
          maxOpenInterest = thisOpenInterest;
        }
      }
    }
    fs.appendFileSync(
      '/home/keith/Downloads/symbolsWithOptions.csv',
      `${s},${maxOpenInterest}\n`
    );
  }
  await mongoApi.disconnectMongoose();
})();
