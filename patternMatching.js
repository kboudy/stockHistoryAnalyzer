const _ = require('lodash'),
  constants = require('./helpers/constants');

const normalizeTo100 = (bars) => {
  let high = null;
  let low = null;

  let volumeHigh = null;
  let volumeLow = null;

  for (const b of bars) {
    if (!high || high < b.high) {
      high = b.high;
    }
    if (!low || low > b.low) {
      low = b.low;
    }

    if (volumeHigh === null || volumeHigh < b.volume) {
      volumeHigh = b.volume;
    }
    if (volumeLow === null || volumeLow > b.volume) {
      volumeLow = b.volume;
    }
  }

  const multiplier = 100 / (high - low);
  const normlize = (n) => (n - low) * multiplier;

  const volMultiplier = 100 / (volumeHigh - volumeLow);
  const volNormlize = (n) => {
    const result = (n - volumeLow) * volMultiplier;
    return result;
  };

  const normlized = [];
  for (const b of bars) {
    normlized.push({
      open: normlize(b.open),
      high: normlize(b.high),
      low: normlize(b.low),
      close: normlize(b.close),
      volume: volNormlize(b.volume),
    });
  }
  return normlized;
};

// given:
//    - a set of OHLCV bars (an array of 12, for instance)
//    - the full set
//  loop through the full set and rank each index with a score, which is simply:
//    - first normalize the highs/lows of both sets 0-100
//    - add the absolute values of the differences between the ohlc's (and v's?)
// returns an array of 0-100 scores (indexes match those of allBars)
const matchPattern = (sampleBars, allBars) => {
  const scores = [];
  for (let i = 0; i < allBars.length - sampleBars.length + 1; i++) {
    const testBars = allBars.slice(i, sampleBars.length + i);

    const normlSampleBars = normalizeTo100(sampleBars);
    const normlTestBars = normalizeTo100(testBars);
    let score = 0;
    for (let j = 0; j < normlSampleBars.length; j++) {
      score += Math.abs(normlSampleBars[j].open - normlTestBars[j].open);
      score += Math.abs(normlSampleBars[j].high - normlTestBars[j].high);
      score += Math.abs(normlSampleBars[j].low - normlTestBars[j].low);
      score += Math.abs(normlSampleBars[j].close - normlTestBars[j].close);
      // score += Math.abs(normlSampleBars[j].volume - normlTestBars[j].volume);
    }

    // make the score range from 0-100 (allows us to compare different-sized bar groups)
    score = score / normlSampleBars.length / 4; // change "4" to "5" if you incorporate volume
    scores.push({
      index: i,
      startDate: allBars[i].date,
      endDate: allBars[i + sampleBars.length - 1].date,
      score,
    }); // storing the index so that we can sort & retain the connection
  }
  return scores;
};

const isCrossOver = (startIndex1, startIndex2, numberOfBars) => {
  const endIndex1 = startIndex1 + numberOfBars;
  const endIndex2 = startIndex2 + numberOfBars;
  return (
    (startIndex1 >= startIndex2 && startIndex1 <= endIndex2) ||
    (endIndex1 >= startIndex2 && endIndex1 <= endIndex2)
  );
};

exports.getMatches = (
  sourcePriceHistory,
  startIndex,
  numberOfBars,
  targetPriceHistories, // an array of priceHistories to compare against the sourcePriceHistory
  targetPriceHistorySymbols,
  significantBars,
  maxPatternMatchingScore
) => {
  const endIndex = startIndex + numberOfBars;
  const barsToMatch = sourcePriceHistory.slice(startIndex, endIndex);
  const scoresWithMaxMin = [];
  for (const targetPriceHistory of targetPriceHistories) {
    let scores = _.orderBy(
      matchPattern(barsToMatch, targetPriceHistory),
      (s) => s.score
    );
    if (scores.length > 0 && scores[0].score === 0) {
      scores = scores.slice(1); // the first score will be the match bars (perfect === 0)
    }
    const nonCrossOvers = [];

    // loop through matches & eliminate any that cross over with others (so the matches are all completely unique blocks of bars)
    for (const score of scores) {
      const isCrossOverWithTestCase = isCrossOver(
        score.index,
        startIndex,
        numberOfBars
      );
      if (isCrossOverWithTestCase) {
        continue;
      }
      let isCrossOverWithOtherMatches = false;
      for (const subScore of nonCrossOvers) {
        if (subScore === score) {
          continue;
        }
        //TODO: don't arbitrarily skip all crossovers.  choose the one with the lowest score
        isCrossOverWithOtherMatches = isCrossOver(
          score.index,
          subScore.index,
          numberOfBars
        );
        if (isCrossOverWithOtherMatches) {
          break;
        }
      }
      if (isCrossOverWithOtherMatches) {
        continue;
      }
      nonCrossOvers.push(score);
    }
    scores = _.orderBy(nonCrossOvers, (s) => s.score);

    scores = scores.filter((s) => s.score <= maxPatternMatchingScore); // higher scores are poorer matches, so "MAX SCORE" is actually a bad score
    for (const s of scores) {
      const lastBarIndex = s.index + numberOfBars - 1;

      if (lastBarIndex >= targetPriceHistory.length) {
        continue;
      }

      const highestOfXBars = {};
      const lowestOfXBars = {};
      for (const sb of significantBars) {
        lowestOfXBars[sb] = 999999999;
        highestOfXBars[sb] = -1;
      }

      for (
        let i = lastBarIndex + 1;
        i < lastBarIndex + Math.max(...significantBars) + 1 &&
        i < targetPriceHistory.length;
        i++
      ) {
        for (const sb of significantBars) {
          if (i >= lastBarIndex + sb + 1) {
            continue;
          }
          if (targetPriceHistory[i].high > highestOfXBars[sb]) {
            highestOfXBars[sb] = targetPriceHistory[i].high;
          }
          if (targetPriceHistory[i].low < lowestOfXBars[sb]) {
            lowestOfXBars[sb] = targetPriceHistory[i].low;
          }
        }
      }

      const maxUpsidePercent_byBarX = {};
      const profitLossPercent_atBarX = {};
      for (const sb of significantBars) {
        if (
          highestOfXBars[sb] === -1 ||
          highestOfXBars[sb] < targetPriceHistory[lastBarIndex].close
        ) {
          maxUpsidePercent_byBarX[sb] = null;
        } else {
          maxUpsidePercent_byBarX[sb] =
            Math.round(
              (highestOfXBars[sb] / targetPriceHistory[lastBarIndex].close -
                1) *
                1000
            ) / 10;
        }

        if (targetPriceHistory.length > lastBarIndex + sb) {
          profitLossPercent_atBarX[sb] =
            Math.round(
              (targetPriceHistory[lastBarIndex + sb].close /
                targetPriceHistory[lastBarIndex].close -
                1) *
                1000
            ) / 10;
        } else {
          profitLossPercent_atBarX[sb] = null;
        }
      }

      const maxDownsidePercent_byBarX = {};
      for (const sb of significantBars) {
        if (
          lowestOfXBars[sb] === 999999999 ||
          lowestOfXBars[sb] > targetPriceHistory[lastBarIndex].close
        ) {
          maxDownsidePercent_byBarX[sb] = null;
        } else {
          maxDownsidePercent_byBarX[sb] =
            Math.round(
              (lowestOfXBars[sb] / targetPriceHistory[lastBarIndex].close - 1) *
                1000
            ) / 10;
        }
      }

      const tphSymbol =
        targetPriceHistorySymbols[
          targetPriceHistories.indexOf(targetPriceHistory)
        ];

      scoresWithMaxMin.push({
        ...s,
        maxUpsidePercent_byBarX,
        maxDownsidePercent_byBarX,
        profitLossPercent_atBarX,
        symbol: tphSymbol,
      });
    }
  }

  return scoresWithMaxMin;
};
