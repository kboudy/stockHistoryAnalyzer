const controllers = require('./controllers');

module.exports = (app) => {
  app.get('/candles', controllers.getHistoricalDataForSymbol);
  app.get('/availableSymbols', controllers.getSymbolNames);
  app.get('/availableNumberOfBars', controllers.getAvailableNumberOfBars);
  app.get('/significantBars', controllers.getSignificantBars);
  app.get('/patternStatsJobRuns', controllers.getPatternStatsJobRuns);
  app.get('/patternStats', controllers.getPatternStats);
  app.get(
    '/getMostRecentCurrentDayResults',
    controllers.getMostRecentCurrentDayResults
  );
  app.post('/runTradeSimulation', controllers.runTradeSimulation);
  app.post('/tradeSimulationRuns', controllers.queryTradeSimulationRuns);
  app.get(
    '/patternStatsJobRunSymbols',
    controllers.getPatternStatsJobRunSymbols
  );
};
