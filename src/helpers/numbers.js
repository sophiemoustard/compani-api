const { BigNumber } = require('bignumber.js');

exports.multiply = (...nums) => nums.reduce((acc, n) => Number(BigNumber(acc).multipliedBy(n)), 1);

exports.divide = (a, b) => Number(BigNumber(a).dividedBy(b));

exports.add = (...nums) => nums.reduce((acc, n) => Number(BigNumber(acc).plus(n)), 0);

exports.subtract = (a, b) => Number(BigNumber(a).minus(b));
