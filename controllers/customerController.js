const Boom = require('boom');
// const flat = require('flat');

const translate = require('../helpers/translate');
const Customer = require('../models/Customer');

const { language } = translate;

const list = async (req) => {
  try {
    const customers = await Customer.find(req.query);
    return {
      message: translate[language].customersShowAllFound,
      data: customers
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const show = async (req) => {
  try {
    const customer = await Customer.findOne({ _id: req.params._id });
    if (!customer) {
      return Boom.notFound(translate[language].customerNotFound);
    }
    return {
      message: translate[language].customerFound,
      data: { customer }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const newCustomer = new Customer(req.payload);
    await newCustomer.save();
    return {
      message: translate[language].customerCreated,
      data: {
        customer: newCustomer
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  show,
  create
};
