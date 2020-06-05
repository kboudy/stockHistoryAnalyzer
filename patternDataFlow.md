## discoverPatternsHelper.js

- `discoverPatternsForSymbol (symbol,targetSymbols,numberOfBars,ignoreMatchesAboveThisScore,mostRecentResultOnly)`
  - called by `currentDayJobRunEngine.js` and `primaryModules/discoverPatterns.js`
  - calls `patternMatching.js`.`getMatches` _(the only thing that does)_

## patternMatching.js

- `getMatches(sourcePriceHistory,startIndex,numberOfBars,targetPriceHistories,targetPriceHistorySymbols,significantBars,ignoreMatchesAboveThisScore)`
  - returns collection of score, which includes:
    - `maxUpsidePercent_byBarX`
    - `maxDownsidePercent_byBarX`
    - `profitLossPercent_atBarX`

## need to consolidate aggregate field generation

- these fields are calculated by `discoverPatternsHelper.js`.`discoverPatternsForSymbol` after calling `getMatches`. `discoverPatternsForSymbol` should calculate them all with dynamic methods, that are passed in to discoverPatternsForSymbol (`actualProfitLossPercent_atBarX` & `actualProfitLossSellDate_atBarX` wouldn't be passed in by `currentDayJobRunEngine`)

  - `actualProfitLossPercent_atBarX`
  - `actualProfitLossSellDate_atBarX`
  - `avg_maxUpsidePercent_byBarX`
  - `stdDev_maxUpsidePercent_byBarX`
  - `avg_maxDownsidePercent_byBarX`
  - `stdDev_maxDownsidePercent_byBarX`
  - `upsideDownsideRatio_byBarX`
  - `avg_profitLossPercent_atBarX`
  - `percentProfitable_atBarX`
  - `percentProfitable_by_1_percent_atBarX`
  - `percentProfitable_by_2_percent_atBarX`
  - `percentProfitable_by_5_percent_atBarX`
  - `percentProfitable_by_10_percent_atBarX`
  - `stdDev_profitLossPercent_atBarX`
