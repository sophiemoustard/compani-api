const Holding = require('../models/Holding');

exports.create = async payload => Holding.create(payload);
