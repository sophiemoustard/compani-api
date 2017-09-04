const mongoose  = require('mongoose');
const db        = require('./database');

mongoose.connect(db.database);

// When successfully connected
mongoose.connection.once('connected', function() {
  return console.log('Successfully connected to MongoDB');
});

// If the connection throws an error
mongoose.connection.on('error', function(err) {
  console.error('There was a db connection error');
  return (err.message);
});

// When the connection is disconnected
mongoose.connection.once('disconnected', function() {
  return console.log('Successfully disconnected from MongoDB');
});

// Models
// require('../models/User');
