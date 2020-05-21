const controllers = require('./controllers');

module.exports = (app) => {
  app.get('/data/candles', controllers.getHistoricalDataForSymbol);
  app.get('/data/availableSymbols', controllers.getAvailableSymbolNames);
  app.get('/data/patternStatsJobRuns', controllers.getPatternStatsJobRuns);
  app.get('/data/patternStats', controllers.getPatternStats);
};
