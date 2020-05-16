const { stockDataDir } = require('./constants'),
  path = require('path'),
  fs = require('fs');

exports.loadHistoricalDataForSymbol = (symbol) => {
  const candles = JSON.parse(
    fs.readFileSync(path.join(stockDataDir, `${symbol}.json`), 'utf8')
  );
  const dateArray = Object.keys(candles).sort();
  return { dateArray, candles };
};

exports.getAvailableSymbolNames = () => {
  const symbols = [];
  const files = fs.readdirSync(stockDataDir);
  for (const f of files) {
    if (f.toLowerCase().endsWith('.json')) {
      symbols.push(f.slice(0, f.length - 5).toUpperCase());
    }
  }
  return symbols.sort();
};
