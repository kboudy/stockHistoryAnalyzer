const ingestData = require('./ingestData');

(async () => {
  const allStockData = await ingestData.execute();
})();
