const controllers = require('./controllers');

module.exports = (app) => {
  app.get('/candles', controllers.getHistoricalDataForSymbol);
  app.get('/availableSymbols', controllers.getSymbolNames);
  app.get('/significantBars', controllers.getSignificantBars);
  app.get('/patternStatsJobRuns', controllers.getPatternStatsJobRuns);
  app.get('/patternStats', controllers.getPatternStats);
  app.post('/runTradeSimulation', controllers.runTradeSimulation);
};
