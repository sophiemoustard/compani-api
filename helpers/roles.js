const _ = require('lodash');
const Boom = require('boom');
const { ObjectID } = require('mongodb');

const Role = require('../models/Role');
const Right = require('../models/Right');
const translate = require('./translate');

const { language } = translate;

const processingRights = rights => rights.map((right) => {
  if (right.right_id && right.right_id._id && (right.right_id.name || right.right_id.permission)) {
    return {
      right_id: right.right_id._id,
      name: right.right_id.name || '',
      permission: right.right_id.permission,
      description: right.right_id.description,
      rolesConcerned: right.rolesConcerned,
      hasAccess: right.hasAccess
    };
  }
});

const populateRole = (rights, options) => {
  if (options && options.onlyGrantedRights) {
    const filteredRights = rights.filter(right => right.hasAccess);
    return processingRights(filteredRights);
  }
  return processingRights(rights);
};

const populateRoles = roles => roles.map((role) => {
  role = role.toObject();
  if (_.isArray(role.rights)) {
    role.rights = populateRole(role.rights);
  }
  return role;
});

const formatRight = (roleRight, rightToUpdate = roleRight) => ({
  right_id: roleRight.right_id,
  hasAccess: rightToUpdate.hasAccess,
  rolesConcerned: rightToUpdate.rolesConcerned && rightToUpdate.rolesConcerned.length > 0 ? rightToUpdate.rolesConcerned : []
});

const formatRoleRights = (rights, rightsUpdateData) => {
  if (rights.length > 0) {
    rights = rights.map((roleRight) => {
      const rightToUpdate = rightsUpdateData.find(right => right.right_id == roleRight.right_id);
      if (!rightToUpdate) return roleRight;

      return formatRight(roleRight, rightToUpdate);
    });

    const newRights = rightsUpdateData.filter(right => !_.some(rights, ['right_id', new ObjectID(right.right_id)]));
    rights.push(...newRights);
  } else {
    rights = rightsUpdateData.map(right => formatRight(right));
  }

  return rights;
};

const updateRights = async (roleId, payload) => {
  const roleToUpdate = await Role.findById(roleId, {}, { autopopulate: false });
  if (!roleToUpdate) throw Boom.notFound(translate[language].roleNotFound);

  const rights = await Right.find({});
  if (rights.length === 0) throw Boom.notFound(translate[language].rightsNotFound);

  const filteredRights = payload.rights.filter(payloadRight => _.some(rights, ['_id', new ObjectID(payloadRight.right_id)]));

  roleToUpdate.rights = formatRoleRights(roleToUpdate.rights, filteredRights);
  if (payload.name) roleToUpdate.name = payload.name;

  let roleUpdated = await roleToUpdate.save();
  roleUpdated = await roleUpdated.populate({
    path: 'rights.right_id',
    select: 'name description permission _id',
    model: Right
  }).execPopulate();
  roleUpdated = roleUpdated.toObject();
  roleUpdated.rights = populateRole(roleUpdated.rights);

  return roleUpdated;
};

module.exports = {
  updateRights,
  populateRole,
  populateRoles,
};
