# StockHistoryAnalyzer

### Purpose: to reveal highly asymmetric trade opportunities using the pattern matching algorithm

## Key Pieces

### `discoverPatterns.js`

- input params: **symbol**, **numberOfBars**, **maxPatternMatchingScore**, & **significantBars**
  - stored in `patternStatsJobRuns` mongo table
- identify all matching candle blocks (of size `numberOfBars`)
  - record various stats of each block in `patternStats`
    - sourceDate
    - avgScore
      - the average matching score. higher = weaker match
    - scoreDates
      - a list of all matching-blocks' dates
        - a matching date is the **beginning** of the block (of `numberOfBars` candles)
    - scoreCount
      - number of matches
    - the following are all recorded per **_significant bar_**
      - a significant bar of **1**, for example, is the first bar **after** the block (`sourceDate` + `numberOfBars` + 1)
    - avg_maxUpsidePercent_byBarX
      - ex: if this value, at bar **5**, were "10":
        - of the 5 bars after the matching block, the highest upside percent
    - stdDev_maxUpsidePercent_byBarX
    - avg_maxDownsidePercent_byBarX
    - stdDev_maxDownsidePercent_byBarX
    - upsideDownsideRatio_byBarX
    - avg_profitLossPercent_atBarX
    - listed_profitLossPercent_atBarX
    - percentProfitable_atBarX
    - percentProfitable_by_1_percent_atBarX
      - like `percentProfitable_atBarX`, but they must have a profit of at least 1%
    - percentProfitable_by_2_percent_atBarX
    - percentProfitable_by_5_percent_atBarX
    - percentProfitable_by_10_percent_atBarX
    - stdDev_profitLossPercent_atBarX
