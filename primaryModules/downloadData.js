const axios = require('axios'),
  moment = require('moment'),
  _ = require('lodash'),
  { symbolsToDownload } = require('../helpers/constants'),
  {
    downloadAndSaveMultipleSymbolHistory,
  } = require('../helpers/candleDownloading'),
  mongoApi = require('../helpers/mongoApi');

(async () => {
  await mongoApi.connectMongoose();
  await downloadAndSaveMultipleSymbolHistory(symbolsToDownload);
  await mongoApi.disconnectMongoose();
})();
