const Boom = require('boom');
const flat = require('flat');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');

const translate = require('../helpers/translate');
const { addFile, createFolderForCompany } = require('../helpers/gdriveStorage');
const Company = require('../models/Company');
const User = require('../models/User');
const drive = require('../models/Google/Drive');
const { MAX_INTERNAL_HOURS_NUMBER } = require('../helpers/constants');
const { updateEventsInternalHourType } = require('../helpers/events');

const { language } = translate;

const update = async (req) => {
  try {
    let companyUpdated;
    if (req.payload.rhConfig && req.payload.rhConfig.transportSubs && !Array.isArray(req.payload.transportSubs)) {
      const { subId } = req.payload.rhConfig.transportSubs;
      req.payload.rhConfig['transportSubs.$'] = req.payload.rhConfig.transportSubs;
      delete req.payload.rhConfig.transportSubs;
      delete req.payload._id;
      companyUpdated = await Company.findOneAndUpdate({
        _id: req.params._id,
        'rhConfig.transportSubs._id': subId,
      }, { $set: flat(req.payload) }, { new: true });
    } else {
      companyUpdated = await Company.findOneAndUpdate({ _id: req.params._id }, { $set: flat(req.payload) }, { new: true });
    }

    if (!companyUpdated) {
      return Boom.notFound(translate[language].companyNotFound);
    }
    return {
      message: translate[language].companyUpdated,
      data: {
        company: companyUpdated,
      },
    };
  } catch (e) {
    req.log('error', e);
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].companyExists);
    }
    return Boom.badImplementation(e);
  }
};

const uploadFile = async (req) => {
  try {
    const allowedFields = [
      'contractWithCompany',
      'contractWithCompanyVersion',
      'contractWithCustomer',
      'contractWithCustomerVersion',
      'debitMandate',
      'quote',
    ];
    const keys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    if (keys.length === 0) return Boom.forbidden('Upload not allowed');

    const uploadedFile = await addFile({
      driveFolderId: req.params.driveId,
      name: req.payload.fileName || req.payload[keys[0]].hapi.filename,
      type: req.payload['Content-Type'],
      body: req.payload[keys[0]],
    });
    const driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });
    const configKey = (keys[0].match(/contract/i)) ? 'rhConfig' : 'customersConfig';
    const payload = {
      [configKey]: {
        templates: {
          [keys[0]]: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink },
        },
      },
    };

    await Company.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });
    return { message: translate[language].fileCreated, data: { uploadedFile } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const addInternalHour = async (req) => {
  try {
    const company = await Company.findOne({ _id: req.params._id });
    if (!company) return Boom.notFound(translate[language].companyNotFound);

    if (company.rhConfig && company.rhConfig.internalHours && company.rhConfig.internalHours.length >= MAX_INTERNAL_HOURS_NUMBER) {
      return Boom.forbidden(translate[language].companyInternalHourCreationNotAllowed);
    }

    const updatedCompany = await Company.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { 'rhConfig.internalHours': req.payload } },
      {
        new: true,
        select: { name: 1, 'rhConfig.internalHours': 1 },
      }
    );

    return {
      message: translate[language].companyInternalHourCreated,
      data: { internalHours: updatedCompany.rhConfig.internalHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const updateInternalHour = async (req) => {
  try {
    const { _id: companyId, internalHourId } = req.params;
    const payload = { 'rhConfig.internalHours.$': { ...req.payload } };
    const company = await Company.findOneAndUpdate(
      {
        _id: companyId,
        'rhConfig.internalHours._id': internalHourId,
      },
      { $set: flat(payload) },
      {
        new: true,
        select: { name: 1, 'rhConfig.internalHours': 1 },
      }
    );

    if (!company) return Boom.notFound(translate[language].companyInternalHourNotFound);

    if (req.payload.name) {
      const updatedInternalHour = company.rhConfig.internalHours.find(hour => hour._id.toHexString() === internalHourId);
      await updateEventsInternalHourType(updatedInternalHour._id, updateInternalHour);
    }

    return {
      message: translate[language].companyInternalHourUpdated,
      data: { internalHours: company.rhConfig.internalHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const getInternalHours = async (req) => {
  try {
    const company = await Company.findOne(
      {
        _id: req.params._id,
        'rhConfig.internalHours': { $exists: true },
      },
      { name: 1, 'rhConfig.internalHours': 1 }
    );

    if (!company) return Boom.notFound(translate[language].companyInternalHoursNotFound);

    return {
      message: translate[language].companyInternalHoursFound,
      data: { internalHours: company.rhConfig.internalHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const removeInternalHour = async (req) => {
  try {
    const { _id: companyId, internalHourId } = req.params;

    const company = await Company.findOne({ _id: companyId });
    if (!company || !company.rhConfig || !company.rhConfig.internalHours) return Boom.notFound(translate[language].companyInternalHourNotFound);

    const internalHour = company.rhConfig.internalHours.find(hour => hour._id.toHexString() === internalHourId);
    if (!internalHour) return Boom.notFound(translate[language].companyInternalHourNotFound);
    if (internalHour.default) return Boom.forbidden(translate[language].companyInternalHourDeletionNotAllowed);

    const defaultType = company.rhConfig.internalHours.find(hour => hour.default);
    if (!defaultType) return Boom.badImplementation();

    await updateEventsInternalHourType(internalHourId, defaultType);

    await Company.findOneAndUpdate(
      { _id: companyId },
      { $pull: { 'rhConfig.internalHours': { _id: internalHourId } } }
    );

    return {
      message: translate[language].companyInternalHourRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const payload = omit(req.payload, 'userId');
    const newCompany = new Company(payload);

    const { folder } = await createFolderForCompany(newCompany.name);
    newCompany.folderId = folder.id;
    await newCompany.save();

    return {
      message: translate[language].companyCreated,
      data: newCompany,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  update,
  uploadFile,
  addInternalHour,
  updateInternalHour,
  getInternalHours,
  removeInternalHour,
  create,
};
