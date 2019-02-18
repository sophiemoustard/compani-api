const Boom = require('boom');
const translate = require('../helpers/translate');
const { populateRole, updateRights, populateRoles } = require('../helpers/roles');
const Role = require('../models/Role');
const Right = require('../models/Right');

const { language } = translate;

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
    let role = null;
    if (!req.payload.rights) {
      role = await Role.findByIdAndUpdate(req.params._id, { $set: req.payload }, { new: true });
      if (!role) return Boom.notFound(translate[language].roleNotFound);
    } else {
      role = await updateRights(req.params._id, req.payload);
    }

    return {
      message: translate[language].roleUpdated,
      data: { role }
    };
  } catch (e) {
    req.log('error', e);
    if (e.output && e.output.statusCode === 404) {
      return e;
    }
    return Boom.badImplementation();
  }
};


const showAll = async (req) => {
  try {
    if (req.query.name && req.query.name.match(/\[.+\]/)) req.query.name = JSON.parse(req.query.name);
    let roles = await Role.find(req.query);
    if (roles.length === 0) return Boom.notFound(translate[language].rolesShowAllNotFound);

    roles = populateRoles(roles);

    return {
      message: translate[language].rolesShowAllFound,
      data: { roles }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const showById = async (req) => {
  try {
    let role = await Role.findById(req.params._id);
    if (!role) return Boom.notFound(translate[language].roleNotFound);

    role = role.toObject();
    if (role.rights) role.rights = populateRole(role.rights);

    return {
      message: translate[language].roleFound,
      data: { role }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const roleDeleted = await Role.findByIdAndRemove(req.params._id);
    if (!roleDeleted) return Boom.notFound(translate[language].roleNotFound);

    return {
      message: translate[language].roleRemoved,
      data: { role: roleDeleted }
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
