## discoverPatternsHelper.js

- `discoverPatternsForSymbol (symbol,targetSymbols,numberOfBars,ignoreMatchesAboveThisScore,mostRecentResultOnly)`
  - called by `currentDayJobRunEngine.js` and `primaryModules/discoverPatterns.js`
  - calls `patternMatching.js`.`getMatches` _(the only thing that does)_

## patternMatching.js

- `getMatches(sourcePriceHistory,startIndex,numberOfBars,targetPriceHistories,targetPriceHistorySymbols,significantBars,ignoreMatchesAboveThisScore)`
  - returns collection of `score`, which includes the following three fields which are used by discoverPatternsForSymbol to build the aggregated results (they are not themselves patternStats fields, since a `score` represents a single match of a pattern, whereas a patternStat represents a collection/aggregation of all the target matches for a single source pattern):
    - `maxUpsidePercent_byBarX`
    - `maxDownsidePercent_byBarX`
    - `profitLossPercent_atBarX`

## need to make aggregate field generation dynamic

- these fields are calculated by `discoverPatternsHelper.js`.`discoverPatternsForSymbol` after calling `getMatches`. `discoverPatternsForSymbol` should calculate them all with dynamic methods, that are passed in to discoverPatternsForSymbol (`actualProfitLossPercent_atBarX` & `actualProfitLossSellDate_atBarX` wouldn't be passed in by `currentDayJobRunEngine`)

  - `actualProfitLossPercent_atBarX`
  - `actualProfitLossSellDate_atBarX`
  - `avg_maxUpsidePercent_byBarX`
  - `avg_maxDownsidePercent_byBarX`
  - `upsideDownsideRatio_byBarX`
  - `avg_profitLossPercent_atBarX`
  - `percentProfitable_atBarX`
  - `percentProfitable_by_1_percent_atBarX`
  - `percentProfitable_by_2_percent_atBarX`
  - `percentProfitable_by_5_percent_atBarX`
  - `percentProfitable_by_10_percent_atBarX`
