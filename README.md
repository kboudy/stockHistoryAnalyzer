# StockHistoryAnalyzer

## Purpose:

### _Reveal asymmetric equity & crypto trade opportunities using the pattern matching algorithm_

# Primary modules

## `downloadData.js`

- downloads the newest equity & crypto data (from TDA & cryptoDataDownload.com) into MongoDB
- currently, the _"symbolsToDownload"_ values are hard-coded in `/helpers/constants.js`

## `discoverPatterns.js`

- input params: `symbols`, `numberOfBars`, `maxPatternMatchingScore`, & `significantBars`
  - stored in `patternStatsJobRuns` mongo table
- `patternStatsJobRuns` are unique per `symbol`, `numberOfBars`, & `maxPatternMatchingScore`
- identify all matching candle blocks (of size `numberOfBars`)
  - in `patternStats`, record the following aggregated stats _(of the matching blocks)_
    - `sourceDate`
    - `avgScore`
      - the average matching score. higher = weaker match, 0 = perfect match
    - `scoreDates`
      - a list of all matching-blocks' dates
        - a matching date is the **beginning** of the block (of `numberOfBars` candles)
    - `scoreCount`
      - number of matches
    - the following are all recorded per **_significant bar_**
      - a significant bar of **1**, for example, is the first bar **after** the block (`sourceDate` + `numberOfBars` + 1)
    - `avg_maxUpsidePercent_byBarX`
      - ex: if this value, at **bar 5**, were _10_:
        - of the 5 bars after the matching block, the highest upside was 10%
    - `stdDev_maxUpsidePercent_byBarX`
    - `avg_maxDownsidePercent_byBarX`
    - `stdDev_maxDownsidePercent_byBarX`
    - `upsideDownsideRatio_byBarX`
    - `avg_profitLossPercent_atBarX`
    - `listed_profitLossPercent_atBarX`
    - `percentProfitable_atBarX`
    - `percentProfitable_by_1_percent_atBarX`
      - like `percentProfitable_atBarX`, but they must have a profit of at least 1%
    - `percentProfitable_by_2_percent_atBarX`
    - `percentProfitable_by_5_percent_atBarX`
    - `percentProfitable_by_10_percent_atBarX`
    - `stdDev_profitLossPercent_atBarX`

## `tuneTradeCriteria.js`

- run **trade simulations** using all possible criteria combinations _(cartesian / monte carlo)_, and record the results

### trade simulation

- look through the patternStats table with the following filters
- record the trade results of the matches
  - a **trade** is:
    - **purchased** at the last-candle-in-block (**bar 0**)
    - **sold** at `significantBar` (input param of `runTradeSimulation`)
