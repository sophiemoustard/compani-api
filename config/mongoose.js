'use strict';

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

// if (process.env.NODE_ENV === 'test') {
//   mongoose.connect('mongodb://localhost:27017/hapi-test');
// } else {
mongoose.connect('mongodb://localhost:27017/hapi-test');
// }

// When successfully connected
mongoose.connection.once('connected', () => console.log('Successfully connected to MongoDB'));

// If the connection throws an error
mongoose.connection.on('error', (err) => {
  console.error('There was a db connection error');
  return (err.message);
});

// When the connection is disconnected
mongoose.connection.once('disconnected', () => console.log('Successfully disconnected from MongoDB'));
