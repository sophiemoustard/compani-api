const Boom = require('boom');
const _ = require('lodash');
const { ObjectID } = require('mongodb');

const translate = require('../helpers/translate');
const { populateRole } = require('../helpers/populateRole');

const { language } = translate;

const Role = require('../models/Role');
const Right = require('../models/Right');

const create = async (req) => {
  try {
    const createPayload = { name: req.payload.name };
    if (!req.payload.rights) {
      const rights = await Right.find();
      if (rights.length > 0) {
        createPayload.rights = rights.map(right => ({ right_id: right._id }));
      }
    } else {
      createPayload.rights = req.payload.rights;
    }
    const role = new Role(createPayload);
    await role.save();
    let createdRole = await Role.findById(role._id);
    createdRole = createdRole.toObject();
    createdRole.rights = populateRole(createdRole.rights);
    return {
      success: true,
      message: translate[language].roleCreated,
      data: {
        role: createdRole
      }
    };
  } catch (e) {
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].roleExists);
    }
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    let roleUpdated = null;
    if (!req.payload.rights) {
      roleUpdated = await Role.findByIdAndUpdate(req.params._id, { $set: req.payload }, { new: true });
      if (!roleUpdated) return Boom.notFound(translate[language].roleNotFound);
    } else {
      const role = await Role.findById(req.params._id, {}, { autopopulate: false });
      if (!role) return Boom.notFound(translate[language].roleNotFound);
      const rights = await Right.find({});
      if (rights.length === 0) return Boom.notFound(translate[language].rightsShowAllNotFound);
      const filteredRights = req.payload.rights.filter(payloadRight => _.some(rights, ['_id', new ObjectID(payloadRight.right_id)]));
      if (role.rights.length > 0) {
        filteredRights.forEach((right) => {
          role.rights = role.rights.map((roleRight) => {
            if (right.right_id === roleRight.right_id.toHexString()) {
              return {
                right_id: roleRight.right_id,
                hasAccess: right.hasAccess,
                rolesConcerned: right.rolesConcerned && right.rolesConcerned.length > 0 ? right.rolesConcerned : []
              };
            }
            return roleRight;
          });
        });
        const newRights = filteredRights.filter(right => !_.some(role.rights, ['right_id', new ObjectID(right.right_id)]));
        role.rights.push(...newRights);
      } else {
        role.rights = filteredRights.map(right => ({
          right_id: right.right_id,
          hasAccess: right.hasAccess,
          rolesConcerned: right.rolesConcerned && right.rolesConcerned.length > 0 ? right.rolesConcerned : []
        }));
      }
      if (req.payload.name) role.name = req.payload.name;
      roleUpdated = await role.save();
      roleUpdated = await roleUpdated.populate({
        path: 'rights.right_id',
        select: 'name description permission _id',
        model: Right
      }).execPopulate();
      roleUpdated = roleUpdated.toObject();
      roleUpdated.rights = populateRole(roleUpdated.rights);
    }
    return {
      message: translate[language].roleUpdated,
      data: {
        role: roleUpdated
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};


const showAll = async (req) => {
  try {
    let roles = await Role.find(req.query);
    if (roles.length === 0) {
      return Boom.notFound(translate[language].rolesShowAllNotFound);
    }
    roles = roles.map((role) => {
      role = role.toObject();
      if (_.isArray(role.rights)) {
        role.rights = populateRole(role.rights);
      }
      return role;
    });
    return {
      message: translate[language].rolesShowAllFound,
      data: {
        roles
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const showById = async (req) => {
  try {
    let role = await Role.findById(req.params._id);
    if (!role) {
      return Boom.notFound(translate[language].roleNotFound);
    }
    role = role.toObject();
    if (role.rights) {
      role.rights = populateRole(role.rights);
    }
    return {
      message: translate[language].roleFound,
      data: {
        role
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const roleDeleted = await Role.findByIdAndRemove(req.params._id);
    if (!roleDeleted) {
      return Boom.notFound(translate[language].roleNotFound);
    }
    return {
      message: translate[language].roleRemoved,
      data: {
        role: roleDeleted
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  create,
  update,
  showAll,
  showById,
  remove
};
