const path = require('path');

exports.TDA_consumerKey = '90BBK6W8IQDOUVMB31HRFQGVTTJ15BMX';

let projectRootDir = path.dirname(require.main.filename);
projectRootDir = projectRootDir.slice(
  0,
  projectRootDir.indexOf('stockHistoryAnalyzer') + 20
);

exports.stockDataDir = path.join(projectRootDir, `stockData`);

// ignore any pattern matches that have a score >= this
exports.MAX_PATTERN_MATCHING_SCORE = 12;

exports.significantBars = [1, 2, 5, 10, 20, 30, 40, 50];
