const Candle = require('../models/candle'),
  SymbolInfo = require('../models/symbolInfo'),
  { getOptionChainData } = require('./tdaCommunication'),
  _ = require('lodash');

const cachedSymbolData = {};

exports.loadHistoricalDataForSymbol = async (symbol) => {
  if (!cachedSymbolData[symbol]) {
    const candles = await Candle.find({ symbol }).lean().sort({ date: 1 });
    const stripped = [];
    for (const c of candles) {
      stripped.push({
        symbol: c.symbol,
        date: c.date,
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseInt(c.volume),
      });
    }
    cachedSymbolData[symbol] = _.orderBy(stripped, (s) => s.date);
  }
  return cachedSymbolData[symbol];
};

exports.repopulateSymbolInfo = async () => {
  const todayUTC = moment.utc();
  for (const symbol of await getAvailableSymbolNames()) {
    console.log(`getting symbol info for ${symbol}`);
    const startDate = (
      await Candle.findOne({ symbol })
        .lean()
        .sort({
          date: 1,
        })
        .limit(1)
    ).date;

    const optionChainData = await getOptionChainData(
      symbol,
      'ALL',
      null,
      100,
      null
    );

    let highestOptionContractOpenInterest = null;
    for (const expDate in optionChainData.callExpDateMap) {
      for (const strike in optionChainData.callExpDateMap[expDate]) {
        const contract = optionChainData.callExpDateMap[expDate][strike][0];
        if (
          !highestOptionContractOpenInterest ||
          contract.openInterest > highestOptionContractOpenInterest
        ) {
          highestOptionContractOpenInterest = contract.openInterest;
        }
      }
    }
    for (const expDate in optionChainData.putExpDateMap) {
      for (const strike in optionChainData.putExpDateMap[expDate]) {
        const contract = optionChainData.putExpDateMap[expDate][strike][0];
        if (
          //using highestOptionContractOpenInterest as a way of sorting most active option symbols
          !highestOptionContractOpenInterest ||
          contract.openInterest > highestOptionContractOpenInterest
        ) {
          highestOptionContractOpenInterest = contract.openInterest;
        }
      }
    }

    await SymbolInfo.deleteMany({
      symbol,
    });

    await SymbolInfo.create({
      created: todayUTC,
      symbol,
      startDate,
      highestOptionContractOpenInterest,
    });
  }
};

const getAvailableSymbolNames = async () => {
  const symbols = await Candle.find({}).lean().distinct('symbol');
  return symbols.sort();
};
exports.getAvailableSymbolNames = getAvailableSymbolNames;

exports.isCrypto = (symbol) => {
  return symbol === 'BTCUSD' || symbol === 'ETHUSD';
};
