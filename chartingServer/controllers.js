const _ = require('lodash'),
  {
    getAvailableSymbolNames,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun'),
  TradeSimulationRun = require('../models/tradeSimulationRun');

exports.getAvailableSymbolNames = async (req, res, next) => {
  try {
    res.json(await getAvailableSymbolNames());
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

exports.getPatternStats = async (req, res, next) => {
  try {
    const { jobRunId } = req.query;

    const results = await PatternStats.find({ jobRun: jobRunId }).lean();
    res.json(results);
  } catch (error) {
    return next(error);
  }
};
