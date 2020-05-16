const { stockDataDir } = require('./helpers/constants'),
  path = require('path'),
  fs = require('fs');

exports.loadHistoricalDataForSymbol = (symbol) => {
  const candles = JSON.parse(
    fs.readFileSync(path.join(stockDataDir, `${symbol}.json`), 'utf8')
  );
  return Object.keys(candles)
    .sort()
    .map((d) => {
      return { date: d, ...candles[d] };
    });
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
