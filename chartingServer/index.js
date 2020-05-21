const express = require('express'),
  bodyParser = require('body-parser'),
  cors = require('cors'),
  mongoose = require('mongoose'),
  routes = require('./routes'),
  mongoApi = require('../helpers/mongoApi'),
  { nodeServerPort } = require('../helpers/constants'),
  app = express();

if (process.env.NODE_ENV !== 'test') {
  mongoApi.connectMongoose();

  // If the connection throws an error
  mongoose.connection.on('error', function (err) {
    console.log('Mongoose default connection error: ' + err);
  });

  // When the connection is disconnected
  mongoose.connection.on('disconnected', function () {
    console.log('Mongoose default connection disconnected');
  });

  process.on('SIGINT', function () {
    mongoose.connection.close(function () {
      console.log(
        'Mongoose default connection is disconnected due to application termination'
      );
      process.exit(0);
    });
  });
}

app.use(cors());
app.options('*', cors());
app.use(bodyParser.json());

routes(app);

const server = app.listen(nodeServerPort, () => {
  console.log(`nodeJs server running on port ${nodeServerPort}`);
});
