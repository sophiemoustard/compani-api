const Boom = require('boom');
const flat = require('flat');
const _ = require('lodash');

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

  const getSubcriptions = async (req) => {
    try {
      const customer = await Customer.findOne(
        {
          _id: req.params._id,
          subscriptions: { $exists: true },
        }, 
        { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
        { autopopulate: false }
      ).lean();

      if (!customer) {
        return Boom.notFound(translate[language].customerSubscriptionsNotFound);
      }

      return {
        message: translate[language].customerSubscriptionsFound,
        data: {
          customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
          subscriptions: customer.subscriptions,
        },
      };
    } catch (e) {
      req.log('error', e);
      return Boom.badImplementation();
    }
  };

  const updateSubscription = async (req) => {
    try {
      const payload = { 'subscriptions.$': { ...req.payload } };
      const customer = await Customer.findOneAndUpdate(
        { _id: req.params._id, 'subscriptions._id': req.params.subscriptionId },
        { $set: flat(payload) },
        {
          new: true,
          select: { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
          autopopulate: false,
        },
      );

      if (!customer) {
        return Boom.notFound(translate[language].customerSubscriptionsNotFound);
      }

      return {
        message: translate[language].customerSubscriptionUpdated,
        data: {
          customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
          subscriptions: customer.subscriptions,
        },
      };
    } catch (e) {
      req.log('error', e);
      return Boom.badImplementation();
    }
  };

  const addSubscription = async (req) => {
    try {
      const customer = await Customer.findByIdAndUpdate(
        { _id: req.params._id },
        { $push: { subscriptions: req.payload } },
        {
          new: true,
          select: { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
          autopopulate: false,
        },
      );
  
      return {
        message: translate[language].customerSubscriptionAdded,
        data: {
          customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
          subscriptions: customer.subscriptions,
        },
      };
    } catch (e) {
      req.log('error', e);
      return Boom.badImplementation();
    }
  };

  const removeSubscription = async (req) => {
    try {
      await Customer.findByIdAndUpdate(
        { _id: req.params._id },
        { $pull: { subscriptions: { _id: req.params.subscriptionId} } },
        {
          select: { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
          autopopulate: false,
        }
      );

      return {
        message: translate[language].customerSubscriptionRemoved,
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
  update,
  getSubcriptions,
  addSubscription,
  updateSubscription,
  removeSubscription,
};
