const Boom = require('boom');
const _ = require('lodash');
const Role = require('../models/Role');
const User = require('../models/User');
const translate = require('./translate');

const { language } = translate;

const getUsers = async (query) => {
  if (query.role) {
    query.role = await Role.findOne({ name: query.role }, { _id: 1 }).lean();
    if (!query.role) throw Boom.notFound(translate[language].roleNotFound);
  }

  if (query.email) {
    query.local = { email: query.email };
    delete query.email;
  }

  const params = _.pickBy(query);
  return User
    .find(
      params,
      { planningModification: 0, historyChanges: 0, features: 0, },
      { autopopulate: false }
    )
    .populate({ path: 'procedure.task', select: 'name' })
    .populate({ path: 'customers', select: 'identity' });
};

module.exports = {
  getUsers
};
