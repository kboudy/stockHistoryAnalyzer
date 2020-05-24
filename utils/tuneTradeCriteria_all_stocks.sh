#!/bin/sh

node primaryModules/tuneTradeCriteria.js -d -s AAPL &
sleep 1
node primaryModules/tuneTradeCriteria.js -s AMZN &
node primaryModules/tuneTradeCriteria.js -s EEM &
node primaryModules/tuneTradeCriteria.js -s EFA &
node primaryModules/tuneTradeCriteria.js -s GLD &
node primaryModules/tuneTradeCriteria.js -s HPQ &
node primaryModules/tuneTradeCriteria.js -s HYG &
node primaryModules/tuneTradeCriteria.js -s IWM &
node primaryModules/tuneTradeCriteria.js -s QQQ &
node primaryModules/tuneTradeCriteria.js -s SLV &
node primaryModules/tuneTradeCriteria.js -s SPY &
node primaryModules/tuneTradeCriteria.js -s TSLA &
