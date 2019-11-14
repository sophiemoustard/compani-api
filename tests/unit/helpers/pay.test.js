const expect = require('expect');
const sinon = require('sinon');

const Pay = require('../../../src/models/Pay');
const FinalPay = require('../../../src/models/FinalPay');
const PayHelper = require('../../../src/helpers/pay');
const UtilsHelper = require('../../../src/helpers/utils');

require('sinon-mongoose');

