#!/bin/sh

& node ~/keith_apps/stockHistoryAnalyzer -d -s AAPL
sleep 1
& node ~/keith_apps/stockHistoryAnalyzer -s AMZN
& node ~/keith_apps/stockHistoryAnalyzer -s EEM
& node ~/keith_apps/stockHistoryAnalyzer -s EFA
& node ~/keith_apps/stockHistoryAnalyzer -s GLD
& node ~/keith_apps/stockHistoryAnalyzer -s HPQ
& node ~/keith_apps/stockHistoryAnalyzer -s HYG
& node ~/keith_apps/stockHistoryAnalyzer -s IWM
& node ~/keith_apps/stockHistoryAnalyzer -s QQQ
& node ~/keith_apps/stockHistoryAnalyzer -s SLV
& node ~/keith_apps/stockHistoryAnalyzer -s SPY
& node ~/keith_apps/stockHistoryAnalyzer -s TSLA