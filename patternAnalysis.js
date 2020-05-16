const {
  getAvailableSymbolNames,
  loadHistoricalDataForSymbol,
} = require('./symbolData');

const symbols = getAvailableSymbolNames();
for (const s of symbols) {
  const d = loadHistoricalDataForSymbol(s);
}
