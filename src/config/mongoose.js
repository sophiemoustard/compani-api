'use strict';

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

exports.mongooseConnection = async (server) => {
  // When successfully connected
  mongoose.connection.on('connected', () => server.log(['info', 'db'], 'Successfully connected to MongoDB'));

  // If the connection throws an error
  mongoose.connection.on('error', (err) => {
    server.log(['error', 'db'], 'There was a db connection error');
    return (err.message);
  });

  // When the connection is disconnected
  mongoose.connection.once('disconnected', () => server.log(['info', 'db'], 'Successfully disconnected from MongoDB'));

  const uri = process.env.NODE_ENV === 'test' ? 'mongodb://127.0.0.1:27017/hapitest' : process.env.MONGODB_URI;
  try {
    await mongoose.connect(uri, { retryWrites: false });
  } catch (e) {
    console.error(e);
    throw e;
  }
};
