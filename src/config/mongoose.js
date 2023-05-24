'use strict';

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

exports.mongooseConnection = async (server) => {
  const isTest = process.env.NODE_ENV === 'test';
  const uri = isTest ? 'mongodb://localhost:27017/hapitest' : process.env.MONGODB_URI;
  const options = { retryWrites: false, ...(isTest && { maxPoolSize: 50 }) };
  await mongoose.connect(uri, options, (err) => { if (err) throw err; });

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
