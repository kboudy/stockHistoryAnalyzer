const _ = require('lodash'),
  {
    getAvailableSymbolNames,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  { downloadBulkCurrentEquityData } = require('../helpers/tdaCommunication'),
  moment = require('moment'),
  { significantBarsArray } = require('../helpers/constants'),
  { runTradeSimulation } = require('../helpers/simulateTrades'),
  Candle = require('../models/candle'),
  PaperTrade = require('../models/paperTrade'),
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

exports.getCurrentDayEvaluationJobRun = async (req, res, next) => {
  try {
    const { jobRunId } = req.query;
    const results = await CurrentDayEvaluationJobRun.findById(jobRunId)
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

exports.getPaperTradingData = async (req, res, next) => {
  try {
    const results = await PaperTrade.find({}).lean().sort({
      buyDate: 1,
    });

    res.json(results);
  } catch (error) {
    return next(error);
  }
};

exports.getCurrentDayJobRunDates = async (req, res, next) => {
  try {
    const results = await CurrentDayEvaluationJobRun.find({})
      .lean()
      .sort({
        created: 1,
      })
      .select({ created: 1 });
    res.json(results);
  } catch (error) {
    return next(error);
  }
};

exports.getMultipleCurrentUnderlyingQuotes = async (req, res, next) => {
  try {
    const symbols = req.query.symbols.split(',');
    const currentData = await downloadBulkCurrentEquityData(symbols);
    res.json(currentData);
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

exports.updatePaperTradeOptionChoice = async (req, res, next) => {
  try {
    const {
      id,
      chosen_option_contract,
      buyPrice_option,
      sellPrice_option,
      option_pl_percent,
    } = req.body;

    const results = await PaperTrade.findByIdAndUpdate(id, {
      chosen_option_contract,
      buyPrice_option,
      sellPrice_option,
      option_pl_percent,
    });

    res.json({ results });
  } catch (error) {
    return next(error);
  }
};

exports.createPaperTrades = async (req, res, next) => {
  try {
    const strToday = moment().format('YYYY-MM-DD');
    const buyDateTime = moment(`${strToday} 4:00PM`, 'YYYY-MM-DD h:mmA')
      .utc()
      .toDate();

    const { symbolsToBuy, jobRunId, heldDays } = req.body;

    const results = [];
    for (const symbol of symbolsToBuy) {
      const todayCandle = await Candle.findOne({
        symbol,
        date: strToday,
      });
      results.push(
        await PaperTrade.create({
          created: moment.utc(),
          symbol: symbol,
          buyDate: buyDateTime,
          sellDate: null,
          heldDays,
          optionExpiration: null,
          optionStrike: null,
          buyPrice_underlying: todayCandle.close,
          buyPrice_option: null,
          sellPrice_underlying: null,
          sellPrice_option: null,
          currentDayEvaluationJobRun: jobRunId,
        })
      );
    }
    res.json({ results });
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
