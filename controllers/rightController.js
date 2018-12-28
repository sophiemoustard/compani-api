const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const Right = require('../models/Right');
const Role = require('../models/Role');

const { language } = translate;

const create = async (req) => {
  try {
    const right = new Right(req.payload);
    await right.save();
    const roles = await Role.find();
    if (roles.length > 0) {
      await Role.updateMany(
        { name: { $not: /^Admin$/ } },
        { $push: { rights: { right_id: right._id, hasAccess: false } } }
      );
      await Role.update(
        { name: 'Admin' },
        { $push: { rights: { right_id: right._id, hasAccess: true } } }
      );
    }

    return {
      message: translate[language].rightCreated,
      data: { right }
    };
  } catch (e) {
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].rightExists);
    }
    console.error(e);
    req.log('error', e);
    return Boom.badImplementation();
  }
};


const update = async (req) => {
  try {
    const rightUpdated = await Right.findOneAndUpdate(
      { _id: req.params._id },
      { $set: flat(req.payload) },
      { new: true }
    );
    if (!rightUpdated) return Boom.notFound(translate[language].rightNotFound);

    return {
      message: translate[language].rightUpdated,
      data: { right: rightUpdated }
    };
  } catch (e) {
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].rightExists);
    }
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const showAll = async (req) => {
  try {
    const rights = await Right.find(req.query).lean();
    if (rights.length === 0) return Boom.notFound(translate[language].rightsShowAllNotFound);

    return {
      message: translate[language].rightsShowAllFound,
      data: { rights }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const showById = async (req) => {
  try {
    const right = await Right.findOne({ _id: req.params._id }).lean();
    if (!right) return Boom.notFound(translate[language].rightNotFound);

    return {
      success: true,
      message: translate[language].rightFound,
      data: { right }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const rightDeleted = await Right.findByIdAndRemove({ _id: req.params._id });
    if (!rightDeleted) return Boom.notFound(translate[language].rightNotFound);

    await Role.update(
      {},
      { $pull: { rights: { right_id: req.params._id } } },
      { multi: true }
    );

    return {
      message: translate[language].rightRemoved,
      data: { rightDeleted }
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
