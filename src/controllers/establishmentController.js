const Boom = require('@hapi/boom');
const EstablishmentsHelper = require('../helpers/establishments');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const establishment = await EstablishmentsHelper.create(req.payload, req.auth.credentials);

    return {
      message: translate[language].establishmentCreated,
      data: { establishment },
    };
  } catch (e) {
    req.log('error', e);
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].siretAlreadyExists);
    }
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const updatedEstablishment = await EstablishmentsHelper.update(req.params._id, req.payload);

    return {
      message: translate[language].establishmentUpdated,
      data: { establishment: updatedEstablishment },
    };
  } catch (e) {
    req.log('error', e);
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].siretAlreadyExists);
    }
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const establishments = await EstablishmentsHelper.list(req.auth.credentials);

    return {
      message: translate[language].establishmentsFound,
      data: { establishments },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await EstablishmentsHelper.remove(req.params._id);

    return { message: translate[language].establishmentRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, update, list, remove };
