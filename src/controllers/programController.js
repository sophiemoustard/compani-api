const Boom = require('@hapi/boom');
const ProgramHelper = require('../helpers/programs');
const SubProgramHelper = require('../helpers/subPrograms');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const programs = await ProgramHelper.list();

    return {
      message: programs.length ? translate[language].programsFound : translate[language].programsNotFound,
      data: { programs },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listELearning = async (req) => {
  try {
    const programs = await ProgramHelper.listELearning();

    return {
      message: programs.length ? translate[language].programsFound : translate[language].programsNotFound,
      data: { programs },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    await ProgramHelper.createProgram(req.payload);

    return {
      message: translate[language].programCreated,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getById = async (req) => {
  try {
    const program = await ProgramHelper.getProgram(req.params._id);

    return {
      message: translate[language].programFound,
      data: { program },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getProgramForUser = async (req) => {
  try {
    const program = await ProgramHelper.getProgramForUser(req.params._id, req.auth.credentials);

    return {
      message: translate[language].programFound,
      data: { program },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await ProgramHelper.updateProgram(req.params._id, req.payload);

    return { message: translate[language].programUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addSubProgram = async (req) => {
  try {
    await SubProgramHelper.addSubProgram(req.params._id, req.payload);

    return { message: translate[language].programUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const uploadImage = async (req) => {
  try {
    await ProgramHelper.uploadImage(req.params._id, req.payload);

    return { message: translate[language].fileCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  listELearning,
  create,
  getById,
  getProgramForUser,
  update,
  addSubProgram,
  uploadImage,
};
