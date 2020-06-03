const controllers = require('./controllers');

module.exports = (app) => {
  app.get('/candles', controllers.getHistoricalDataForSymbol);
  app.get('/availableSymbols', controllers.getSymbolNames);
  app.get('/availableNumberOfBars', controllers.getAvailableNumberOfBars);
  app.get('/significantBars', controllers.getSignificantBars);
  app.get('/patternStatsJobRuns', controllers.getPatternStatsJobRuns);
  app.get('/patternStats', controllers.getPatternStats);
  app.get(
    '/currentDayEvaluationJobRun',
    controllers.getCurrentDayEvaluationJobRun
  );
  app.post('/runTradeSimulation', controllers.runTradeSimulation);
  app.post('/tradeSimulationRuns', controllers.queryTradeSimulationRuns);
  app.post('/paperTrades', controllers.createPaperTrades);
  app.post(
    '/updatePaperTradeOptionChoice',
    controllers.updatePaperTradeOptionChoice
  );

  app.get(
    '/multipleCurrentUnderlyingQuotes',
    controllers.getMultipleCurrentUnderlyingQuotes
  );
  app.get('/currentDayJobRunDates', controllers.getCurrentDayJobRunDates);
  app.get('/paperTrading', controllers.getPaperTradingData);
  app.get(
    '/patternStatsJobRunSymbols',
    controllers.getPatternStatsJobRunSymbols
  );
};
