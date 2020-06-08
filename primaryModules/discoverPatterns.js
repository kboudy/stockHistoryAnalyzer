//PURPOSE: to run multiple price history series against the matching algo & store the aggregated results in mongodb

const {
    getAvailableSymbolNames,
    isCrypto,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  _ = require('lodash'),
  {
    discoverPatternsForSymbol,
    dropPatternCollections,
  } = require('../helpers/discoverPatternsHelper'),
  { numberOfBarsArray } = require('../helpers/constants'),
  mongoApi = require('../helpers/mongoApi');

const argOptions = {
  dropCollection: {
    alias: 'd',
    type: 'boolean',
    description: `at the start, drop the PatternStats & PatternStatsJobRuns collections`,
  },
  symbols: {
    alias: 's',
    type: 'array',
    description: `symbol(s) to loop through`,
  },
  numberOfBars: {
    alias: 'n',
    type: 'array',
    description: `numberOfBars(s) to loop through`,
  },
  includeOtherPriceHistories: {
    alias: 'i',
    description: `include other symbols' price histories as target matches (default=false)`,
    choices: ['true', 'false', 'both'],
  },
};

const { argv } = require('yargs')
  .alias('help', 'h')
  .version(false)
  .options(argOptions);

(async () => {
  await mongoApi.connectMongoose();
  if (argv.dropCollection) {
    console.log('dropping PatternStats & PatternStatsJobRuns collections');
    await dropPatternCollections();
  }

  let includeOtherPriceHistoriesAsTargets;
  if (argv.includeOtherPriceHistories) {
    if (argv.includeOtherPriceHistories.toLowerCase() === 'true') {
      includeOtherPriceHistoriesAsTargets = [true];
    } else if (argv.includeOtherPriceHistories.toLowerCase() === 'false') {
      includeOtherPriceHistoriesAsTargets = [false];
    } else {
      includeOtherPriceHistoriesAsTargets = [true, false];
    }
  } else {
    includeOtherPriceHistoriesAsTargets = [false];
  }

  const ignoreMatchesAboveThisScore = 12;
  const numberOfBars = argv.numberOfBars
    ? argv.numberOfBars
    : numberOfBarsArray;

  const allSymbols = await getAvailableSymbolNames();
  const equitySymbols = allSymbols.filter((s) => !isCrypto(s));
  const cryptoSymbols = allSymbols.filter((s) => isCrypto(s));
  const symbolsToLoop = argv.symbols ? argv.symbols : allSymbols;

  for (const symbol of symbolsToLoop) {
    console.log(
      `${symbol} (${symbolsToLoop.indexOf(symbol) + 1}/${symbolsToLoop.length})`
    );
    for (const nb of numberOfBars) {
      for (const includeOtherPriceHistories of includeOtherPriceHistoriesAsTargets) {
        let targetPriceHistorySymbols = [symbol];
        if (includeOtherPriceHistories) {
          //convention: the targetPriceHistory symbols should always start with the source symbol
          targetPriceHistorySymbols = isCrypto(symbol)
            ? cryptoSymbols
            : equitySymbols;
          targetPriceHistorySymbols = targetPriceHistorySymbols.filter(
            (s) => s !== symbol
          );
          targetPriceHistorySymbols = [symbol, ...targetPriceHistorySymbols];
        }

        console.log(
          `  [numberOfBars: ${nb}, includeOtherPriceHistories: ${includeOtherPriceHistories}]`
        );
        process.stdout.write('    ');
        const sourcePriceHistory = await loadHistoricalDataForSymbol(symbol);
        await discoverPatternsForSymbol(
          symbol,
          sourcePriceHistory,
          targetPriceHistorySymbols,
          nb,
          ignoreMatchesAboveThisScore,
          true,
          true,
          true,
          null
        );
      }
    }
  }
  await mongoApi.disconnectMongoose();
})();
