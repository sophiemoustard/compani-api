const Boom = require('@hapi/boom');
const flat = require('flat');
const ProgramHelper = require('../helpers/programs');
const ModuleHelper = require('../helpers/modules');
const Program = require('../models/Program');
const translate = require('../helpers/translate');
const cloudinary = require('../helpers/cloudinary');
const moment = require('moment');

const { language } = translate;

const list = async (req) => {
  try {
    const programs = await ProgramHelper.list(req.query);

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

const update = async (req) => {
  try {
    await ProgramHelper.updateProgram(req.params._id, req.payload);

    return {
      message: translate[language].programUpdated,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addModule = async (req) => {
  try {
    await ModuleHelper.addModule(req.params._id, req.payload);

    return {
      message: translate[language].programUpdated,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const uploadImage = async (req) => {
  try {
    const imageUploaded = await cloudinary.addImage({
      file: req.payload.file,
      folder: 'images/business/Compani/programs',
      public_id: `${req.payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`,
    });
    const payload = {
      image: {
        publicId: imageUploaded.public_id,
        link: imageUploaded.secure_url,
      },
    };

    const programUpdated = await Program.findOneAndUpdate(
      { _id: req.params._id },
      { $set: flat(payload) },
      { new: true }
    );

    return {
      message: translate[language].fileCreated,
      data: { image: payload.image, programUpdated },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  getById,
  update,
  addModule,
  uploadImage,
};
