const { BigNumber } = require('bignumber.js');

exports.multiply = (a, b) => Number(BigNumber(a).multipliedBy(b));

exports.dividedBy = (a, b) => Number(BigNumber(a).dividedBy(b));

exports.add = (a, b) => Number(BigNumber(a).plus(b));

exports.substract = (a, b) => Number(BigNumber(a).minus(b));
