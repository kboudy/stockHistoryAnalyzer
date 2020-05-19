const mongoose = require('mongoose'),
  { sleep } = require('./miscMethods');

const INDEX_NAME = 'stock_analysis',
  MONGO_HOST_NAME = 'localhost',
  MONGO_PORT = 27017;

const mongoUrl = `mongodb://${MONGO_HOST_NAME}:${MONGO_PORT}/${INDEX_NAME}`;
exports.mongoUrl = mongoUrl;

const connectMongoose = async () => {
  const dbOptions = {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  let connectSucceeded = false;
  while (!connectSucceeded) {
    try {
      await mongoose.connect(mongoUrl, dbOptions);
      connectSucceeded = true;
    } catch (err) {
      console.error(
        'Failed to connect to mongo on startup - retrying in 5 sec',
        err
      );
      await sleep(5000);
    }
  }
};
exports.connectMongoose = connectMongoose;

const disconnectMongoose = async () => {
  await mongoose.disconnect();
};
exports.disconnectMongoose = disconnectMongoose;
