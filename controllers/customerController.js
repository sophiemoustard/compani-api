const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const Customer = require('../models/Customer');

const { language } = translate;

const list = async (req) => {
  try {
    const { lastname, firstname, ...payload } = req.query;
    if (lastname) {
      payload['identity.lastname'] = { $regex: lastname, $options: 'i' };
    }
    if (firstname) {
      payload['identity.firstname'] = { $regex: firstname, $options: 'i' };
    }
    const customers = await Customer.find(payload);
    return {
      message: translate[language].customersShowAllFound,
      data: { customers }
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

const remove = async (req) => {
  try {
    const customerDeleted = await Customer.findByIdAndRemove(req.params._id);
    if (!customerDeleted) {
      return Boom.notFound(translate[language].customerNotFound);
    }
    return {
      message: translate[language].customerRemoved,
      data: {
        customer: customerDeleted
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    const customerUpdated = await Customer.findOneAndUpdate({ _id: req.params._id }, { $set: flat(req.payload) }, { new: true });
    if (!customerUpdated) {
      return Boom.notFound(translate[language].customerNotFound);
    }
    return {
      message: translate[language].customerUpdated,
      data: {
        customer: customerUpdated
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
  create,
  remove,
  update
};
