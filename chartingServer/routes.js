const controllers = require('./controllers');

module.exports = (app) => {
  app.get('/candles', controllers.getHistoricalDataForSymbol);
  app.get('/availableSymbols', controllers.getAvailableSymbolNames);
  app.get('/patternStatsJobRuns', controllers.getPatternStatsJobRuns);
  app.get('/patternStats', controllers.getPatternStats);
  app.post('/runTradeSimulation', controllers.runTradeSimulation);
};
