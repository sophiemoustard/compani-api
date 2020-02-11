const Role = require('../models/Role');

exports.list = async (query) => {
  const roles = await Role.find(query).lean({ autopopulate: true });

  return roles;
};
