const _ = require('lodash'),
  {
    getAvailableSymbolNames,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  { significantBarsArray } = require('../helpers/constants'),
  { runTradeSimulation } = require('../helpers/simulateTrades'),
  { runCurrentDayJob } = require('../helpers/currentDayJobRunner'),
  Candle = require('../models/candle'),
  PatternStats = require('../models/patternStats'),
  CurrentDayEvaluationJobRun = require('../models/currentDayEvaluationJobRun'),
  PatternStatsJobRun = require('../models/patternStatsJobRun'),
  TradeSimulationRun = require('../models/tradeSimulationRun');

exports.getSymbolNames = async (req, res, next) => {
  try {
    res.json(await getAvailableSymbolNames());
  } catch (error) {
    return next(error);
  }
};

exports.getAvailableNumberOfBars = async (req, res, next) => {
  try {
    const numberOfBars = await PatternStatsJobRun.find({})
      .lean()
      .distinct('numberOfBars');
    res.json(numberOfBars);
  } catch (error) {
    return next(error);
  }
};

exports.getSignificantBars = async (req, res, next) => {
  try {
    res.json(significantBarsArray);
  } catch (error) {
    return next(error);
  }
};

exports.getHistoricalDataForSymbol = async (req, res, next) => {
  try {
    const { symbol } = req.query;
    res.json(await loadHistoricalDataForSymbol(symbol));
  } catch (error) {
    return next(error);
  }
};

// not yet used
exports.getPatternStatsJobRuns = async (req, res, next) => {
  try {
    const {
      createdAfter,
      updatedAfter,
      numberOfBars,
      sourceSymbol,
    } = req.query;

    const filter = {};
    if (createdAfter) {
      filter.created = {
        $gte: createdAfter,
      };
    }
    if (updatedAfter) {
      filter.updated = {
        $gte: updatedAfter,
      };
    }
    if (numberOfBars) {
      filter.numberOfBars = numberOfBars;
    }
    if (sourceSymbol) {
      filter.sourceSymbol = sourceSymbol;
    }

    const results = await PatternStatsJobRun.find(filter).lean();
    res.json(results);
  } catch (error) {
    return next(error);
  }
};

exports.getMostRecentCurrentDayResults = async (req, res, next) => {
  try {
    const results = await CurrentDayEvaluationJobRun.findOne({})
      .lean()
      .sort({
        created: -1,
      })
      .limit(1);

    res.json(results);
  } catch (error) {
    return next(error);
  }
};

exports.getPatternStats = async (req, res, next) => {
  try {
    const { jobRunId } = req.query;

    const results = await PatternStats.find({ jobRun: jobRunId }).lean();
    res.json(results);
  } catch (error) {
    return next(error);
  }
};

exports.getPatternStatsJobRunSymbols = async (req, res, next) => {
  try {
    const symbols = await PatternStatsJobRun.find({})
      .lean()
      .distinct('sourceSymbol');
    res.json(_.orderBy(symbols, (s) => s));
  } catch (error) {
    return next(error);
  }
};

exports.queryTradeSimulationRuns = async (req, res, next) => {
  try {
    const { queryParams, querySort, startRow, endRow } = req.body;

    if (!queryParams['results.tradeCount']) {
      queryParams['results.tradeCount'] = { $gt: 0 };
    }

    const requestedSetSize = endRow - startRow;
    const defaultSort = {
      'results.avgProfitLossPercent': -1,
    };
    console.log(JSON.stringify(queryParams));

    const results = await TradeSimulationRun.find(queryParams)
      .sort(querySort ? querySort : defaultSort)
      .skip(startRow)
      .limit(requestedSetSize + 1); // getting 1 too many rows intentionally - so we can tell if it's the last set

    const isLastSet = results.length < requestedSetSize + 1;
    const correctedResultSize = results.slice(0, requestedSetSize);

    res.json({ results: correctedResultSize, isLastSet });
  } catch (error) {
    return next(error);
  }
};

exports.runCurrentDayJob = async (req, res, next) => {
  try {
    const results = await runCurrentDayJob();
    res.json(results);
  } catch (error) {
    return next(error);
  }
};

exports.runTradeSimulation = async (req, res, next) => {
  try {
    const {
      symbol,
      includeOtherSymbolsTargets,
      numberOfBars,
      ignoreMatchesAboveThisScore,
      significantBar,
      patternStatsConfig,
    } = req.body;

    if (!symbol) {
      return;
    }

    const results = await runTradeSimulation(
      symbol,
      includeOtherSymbolsTargets,
      numberOfBars,
      ignoreMatchesAboveThisScore,
      significantBar,
      patternStatsConfig,
      true
    );
    res.json(results);
  } catch (error) {
    return next(error);
  }
};
