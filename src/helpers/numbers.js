const { BigNumber } = require('bignumber.js');

exports.oldMultiply = (...nums) => nums.reduce((acc, n) => BigNumber(acc).multipliedBy(n).toNumber(), 1);

exports.oldDivide = (a, b) => BigNumber(a).dividedBy(b).toNumber();

exports.oldAdd = (...nums) => nums.reduce((acc, n) => BigNumber(acc).plus(n).toNumber(), 0);

exports.oldSubtract = (a, b) => BigNumber(a).minus(b).toNumber();
