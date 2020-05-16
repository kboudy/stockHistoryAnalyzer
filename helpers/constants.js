const path = require('path');

exports.TDA_consumerKey = '90BBK6W8IQDOUVMB31HRFQGVTTJ15BMX';

const projectRootDir = path.dirname(require.main.filename);
exports.stockDataDir = path.join(projectRootDir, `stockData`);

// ignore any pattern matches that have a score >= this
exports.MAX_PATTERN_MATCHING_SCORE = 12;
