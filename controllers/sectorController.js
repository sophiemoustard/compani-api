const Boom = require('boom');

const Sector = require('../models/Sector');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const sector = new Sector(req.payload);
    await sector.save();

    return {
      message: translate[language].sectorCreated,
      data: { sector }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
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
    return Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    if (req.query.name) req.query.name = { $regex: new RegExp(`^${req.query.name}$`), $options: 'i' };
    const sectors = await Sector.find(req.query);

    return {
      message: translate[language].sectorsFound,
      data: { sectors },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
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
    return Boom.badImplementation(e);
  }
};

module.exports = {
  create,
  update,
  list,
  remove
};
