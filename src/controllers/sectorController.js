const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Sector = require('../models/Sector');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const query = { ...req.query, company: get(req, 'auth.credentials.company._id', null) };
    if (req.query.name) query.name = { $regex: new RegExp(`^${req.query.name}$`), $options: 'i' };
    const sectors = await Sector.find(query).lean();

    return {
      message: translate[language].sectorsFound,
      data: { sectors },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const sector = new Sector({ ...req.payload, company: get(req, 'auth.credentials.company._id', null) });
    await sector.save();

    return {
      message: translate[language].sectorCreated,
      data: { sector },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const updatedSector = await Sector.findOneAndUpdate({ _id: req.params._id }, { $set: req.payload }, { new: true });

    if (!updatedSector) return Boom.notFound(translate[language].sectorNotFound);

    return {
      message: translate[language].sectorUpdated,
      data: { updatedSector },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    const sector = await Sector.findByIdAndRemove(req.params._id);

    if (!sector) {
      return Boom.notFound(translate[language].sectorNotFound);
    }
    return { message: translate[language].sectorDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  create,
  update,
  list,
  remove,
};
