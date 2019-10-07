'use strict';

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

exports.mongooseConnection = (server) => {
  if (process.env.NODE_ENV === 'test') {
    mongoose.connect(
      'mongodb://localhost:27017/hapitest',
      { useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false, useUnifiedTopology: true }
    );
  } else {
    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false, useUnifiedTopology: true });
  }

  // When successfully connected
  mongoose.connection.once('connected', () => server.log(['info', 'db'], 'Successfully connected to MongoDB'));

  // If the connection throws an error
  mongoose.connection.on('error', (err) => {
    server.log(['error', 'db'], 'There was a db connection error');
    return (err.message);
  });

  // When the connection is disconnected
  mongoose.connection.once('disconnected', () => server.log(['info', 'db'], 'Successfully disconnected from MongoDB'));
};
