const Boom = require('boom');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const tokenProcess = require('../helpers/tokenProcess');

const User = require('../models/User');
const Role = require('../models/Role');
const Feature = require('../models/Feature');
const { populateRole } = require('../helpers/populateRole');
const translate = require('../helpers/translate');

const { language } = translate;

module.exports = {
  authorize: async (req) => {
    let user = {};
    try {
      user = await User.findOne({ 'local.email': req.payload.email });
      if (!user) {
        return Boom.notFound(translate[language].userAuthNotFound);
      }
      if (!user.refreshToken) {
        return Boom.forbidden();
      }
      if (!await bcrypt.compare(req.payload.password, user.local.password)) {
        return Boom.unauthorized(translate[language].userAuthFailed);
      }
      const payload = {
        firstname: user.firstname,
        lastname: user.lastname,
        _id: user.id,
        local: {
          email: user.local.email
        },
        role: user.role,
        customer_id: user.customer_id,
        employee_id: user.employee_id,
        sector: user.sector,
        createdAt: user.createdAt,
      };
      const newPayload = _.pickBy(payload);
      const token = tokenProcess.encode(newPayload);
      req.log('info', `${req.payload.email} connected`);
      return { message: translate[language].userAuthentified, data: { token, user } };
    } catch (e) {
      req.log('error', e);
      return Boom.badImplementation();
    }
  },
  getUserByParamId: async (req) => {
    try {
      const user = await User.findOne({ _id: req.params._id }).populate({
        path: 'role',
        model: Role,
        select: '-__v -createdAt -updatedAt',
        populate: {
          path: 'features.feature_id',
          model: Feature,
          select: '-__v -createdAt -updatedAt'
        }
      }).lean();
      if (!user) {
        return Boom.notFound(translate[language].userNotFound);
      }
      const alenviToken = tokenProcess.encode({ _id: user._id });
      const payload = {
        firstname: user.firstname,
        lastname: user.lastname,
        _id: user._id,
        local: {
          email: user.local.email
        },
        role: user.role.name,
        customer_id: user.customer_id,
        employee_id: user.employee_id,
        sector: user.sector,
        administrative: user.administrative,
        managerId: user.managerId,
        createdAt: user.createdAt,
        slack: user.slack,
        token: alenviToken
      };
      return { message: translate[language].userFound, data: { user: payload } };
    } catch (e) {
      req.log('error', e);
      return Boom.badImplementation();
    }
  },
  showAll: async (req) => {
    try {
      if (req.query.role) {
        req.query.role = await Role.findOne({ name: req.query.role }, { _id: 1 }).lean();
      }
      const params = _.pickBy(req.query);
      // We populate the user with role data and then we populate the role with features data
      let users = await User.find(params).populate({
        path: 'role',
        select: '-__v -createdAt -updatedAt',
        populate: {
          path: 'features.feature_id',
          select: '-__v -createdAt -updatedAt'
        }
      });
      if (users.length === 0) {
        return Boom.notFound(translate[language].userShowAllNotFound);
      }
      // we can't use lean as it doesn't work well with deep populate so we have to use this workaround to get an array of js objects and not mongoose docs.
      users = users.map(user => user.toObject());
      // Format populated role to be read easier
      for (let i = 0, l = users.length; i < l; i++) {
        if (users[i].role && users[i].role.features) {
          users[i].role.features = populateRole(users[i].role.features);
        }
      }
      return { message: translate[language].userShowAllFound, data: { users } };
    } catch (e) {
      req.log('error', e);
      return Boom.badImplementation();
    }
  }
};
