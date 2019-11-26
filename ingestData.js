const fs = require('fs'),
  path = require('path'),
  moment = require('moment'),
  _ = require('lodash'),
  papa = require('papaparse'),
  readline = require('readline');

const parseCsv = filepath => {
  const file = fs.createReadStream(filepath);
  const rows = [];
  return new Promise((resolve, reject) => {
    papa.parse(file, {
      worker: true, // Don't bog down the main thread if its a big file
      step: function(result) {
        rows.push(result.data);
      },
      complete: function(results, file) {
        const objects = [];
        let headerVals = null;
        for (const r of rows) {
          if (!headerVals) {
            headerVals = r;
          } else {
            const o = {};
            for (const idx in headerVals) {
              const h = headerVals[idx];
              const fieldName = h.toLowerCase();
              if (h === 'Date') {
                o[fieldName] = moment(r[idx], 'M/D/YYYY').valueOf();
              } else if (h === 'Volume') {
                o[fieldName] = parseInt(r[idx]);
              } else {
                o[fieldName] = parseFloat(r[idx]);
              }
            }
            objects.push(o);
          }
        }
        resolve(objects);
      }
    });
  });
};

const execute = async () => {
  const allStockData = {};
  for (const f of fs.readdirSync('stockData')) {
    const stockSymbol = path.parse(f).name;
    const sortedStockData = _.orderBy(
      await parseCsv(`stockData/${f}`),
      o => o.date
    );

    allStockData[stockSymbol] = sortedStockData;
  }
  const stockSymbols = Object.keys(allStockData);
  let ssDates = {};
  for (const stockSymbol of stockSymbols) {
    ssDates[stockSymbol] = allStockData[stockSymbol].map(d => d.date);
  }
  for (const stockSymbol of stockSymbols) {
    for (let idx = allStockData[stockSymbol].length - 1; idx >= 0; idx--) {
      const date = allStockData[stockSymbol][idx].date;
      // if all other stock symbols have this date, keep it
      for (const ssSub of stockSymbols) {
        if (ssSub === stockSymbol) {
          continue;
        }
        if (!ssDates[ssSub].includes(date)) {
          allStockData[stockSymbol].splice(idx, 1);
          break;
        }
      }
    }
  }
  // now, all stock data has the same dates
  return allStockData;
};
exports.execute = execute;
