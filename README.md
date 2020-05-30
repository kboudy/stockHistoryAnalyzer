# StockHistoryAnalyzer

## Purpose:

### _Reveal asymmetric equity & crypto trade opportunities using the pattern matching algorithm_

# Primary modules

## `downloadData.js`

- downloads the newest equity & crypto data (from TDA & cryptoDataDownload.com) into MongoDB
- currently, the _"symbolsToDownload"_ values are hard-coded in `/helpers/constants.js`

## `discoverPatterns.js`

- `discoverPatternsForSymbol`
  - takes input params: `symbols`, `numberOfBars`, `ignoreMatchesAboveThisScore`, & `significantBars`
  - for each symbol, iterates a rolling window (of `numberOfBars` size) and finds closest matches throughout the price history
  - results stored in `patternStatsJobRuns` mongo table
    - job run results are unique per `symbol`, `numberOfBars`, & `ignoreMatchesAboveThisScore`
  - `symbols`: the array of symbols to run pattern matching on
  - `numberOfBars`: the number of bars that constitutes a matching "window"
  - `ignoreMatchesAboveThisScore`: ignore matches (don't bother recording the result) if the score is above this
  - `significantBars`:
    - stats like `profitLossPercent_atBarX` will be generated & stored in `patternStats` for each of these
    - **bar 1** is the first day after the matching window (and the first day you'd be able sell the trade)
      - the buy trade always happens at the close of the day the matching window was discovered _(bar 0)_
- identify all matching candle blocks (of size `numberOfBars`)
  - in `patternStats`, record the following aggregated stats _(of the matching blocks)_
    - `sourceDate`
    - `avgScore`
      - the average matching score. higher = weaker match, 0 = perfect match
    - `scoreDates`
      - just used for debugging, and takes up a bunch of space in the db, so the associated code is currently commented out
      - a list of all matching-blocks' dates (grouped by target symbol)
        - a matching date is the **beginning** of the block (of `numberOfBars` candles)
    - `scoreCount`
      - number of matches
    - the following are all recorded per **_significant bar_**
      - a significant bar of **5**, for example, is the fifth bar **after** the block `(sourceDate + numberOfBars - 1) + 5`
    - `avg_maxUpsidePercent_byBarX`
      - ex: if this value, at **bar 5**, were _22_:
        - of the 5 bars after the matching block, the highest upside was 22%
    - `stdDev_maxUpsidePercent_byBarX`
    - `avg_maxDownsidePercent_byBarX`
    - `stdDev_maxDownsidePercent_byBarX`
    - `upsideDownsideRatio_byBarX`
    - `avg_profitLossPercent_atBarX`
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

---

# Charting (React) application

- to launch:

  ```sh
  npm run charting
  ```

# backing up the db

node utils/backupDb.js
