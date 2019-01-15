const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const { addFile } = require('../helpers/gdriveStorage');
const Company = require('../models/Company');
const drive = require('../models/GoogleDrive');
const { MAX_INTERNAL_HOURS_NUMBER } = require('../helpers/constants');

const { language } = translate;

const list = async (req) => {
  try {
    const companies = await Company.find(req.query);

    return {
      message: translate[language].companiesShowAllFound,
      data: companies
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const show = async (req) => {
  try {
    const company = await Company.findOne({ _id: req.params._id });
    if (!company) return Boom.notFound(translate[language].companyNotFound);

    return {
      message: translate[language].companyFound,
      data: { company }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const newCompany = new Company(req.payload);
    await newCompany.save();

    return {
      message: translate[language].companyCreated,
      data: { company: newCompany }
    };
  } catch (e) {
    req.log('error', e);
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].companyExists);
    }
    return Boom.badImplementation();
  }
};

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
        'rhConfig.transportSubs._id': subId
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
        company: companyUpdated
      }
    };
  } catch (e) {
    req.log('error', e);
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].companyExists);
    }
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    await Company.findOneAndRemove({ _id: req.params._id });

    return { message: translate[language].companyDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const uploadFile = async (req) => {
  try {
    const allowedFields = [
      'contract',
      'amendment',
      'debitMandate',
      'quote',
    ];
    const keys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    if (keys.length === 0) {
      Boom.forbidden('Upload not allowed');
    }
    const uploadedFile = await addFile({
      driveFolderId: req.params.driveId,
      name: req.payload.fileName || req.payload[keys[0]].hapi.filename,
      type: req.payload['Content-Type'],
      body: req.payload[keys[0]]
    });
    const driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });
    const configKey = (keys[0] === 'contract' || keys[0] === 'amendment') ? 'rhConfig' : 'customersConfig';
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
    return Boom.badImplementation();
  }
};

const getCompanyServices = async (req) => {
  try {
    const company = await Company.findOne(
      {
        _id: req.params._id,
        'customersConfig.services': { $exists: true },
      },
      { name: 1, 'customersConfig.services': 1 },
    );

    if (!company) return Boom.notFound(translate[language].companyServicesNotFound);

    return {
      message: translate[language].companyServicesFound,
      data: { services: company.customersConfig.services },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const createCompanyService = async (req) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { 'customersConfig.services': req.payload } },
      {
        new: true,
        select: { name: 1, 'customersConfig.services': 1 },
      },
    );

    return {
      message: translate[language].companyServiceCreated,
      data: { services: company.customersConfig.services },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateCompanyService = async (req) => {
  try {
    const payload = { 'customersConfig.services.$': { ...req.payload } };
    const company = await Company.findOneAndUpdate(
      {
        _id: req.params._id,
        'customersConfig.services._id': req.params.serviceId,
      },
      { $set: flat(payload) },
      {
        new: true,
        select: { name: 1, 'customersConfig.services': 1 },
      },
    );

    if (!company) return Boom.notFound(translate[language].companyServicesNotFound);

    return {
      message: translate[language].companyServicesUpdated,
      data: { services: company.customersConfig.services },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const deleteCompanyService = async (req) => {
  try {
    await Company.findOneAndUpdate(
      { _id: req.params._id },
      { $pull: { 'customersConfig.services': { _id: req.params.serviceId } } },
    );

    return {
      message: translate[language].companyServiceDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
      },
    );

    return {
      message: translate[language].companyInternalHourCreated,
      data: { internalHours: updatedCompany.rhConfig.internalHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateInternalHour = async (req) => {
  try {
    const payload = { 'rhConfig.internalHours.$': { ...req.payload } };
    const company = await Company.findOneAndUpdate(
      {
        _id: req.params._id,
        'rhConfig.internalHours._id': req.params.internalHourId,
      },
      { $set: flat(payload) },
      {
        new: true,
        select: { name: 1, 'rhConfig.internalHours': 1 },
      },
    );

    if (!company) return Boom.notFound(translate[language].companyInternalHourNotFound);

    return {
      message: translate[language].companyInternalHourUpdated,
      data: { internalHours: company.rhConfig.internalHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getInternalHours = async (req) => {
  try {
    const company = await Company.findOne(
      {
        _id: req.params._id,
        'rhConfig.internalHours': { $exists: true },
      },
      { name: 1, 'rhConfig.internalHours': 1 },
    );

    if (!company) return Boom.notFound(translate[language].companyInternalHoursNotFound);

    return {
      message: translate[language].companyInternalHoursFound,
      data: { internalHours: company.rhConfig.internalHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};
const removeInternalHour = async (req) => {
  try {
    const company = await Company.findOne({ _id: req.params._id });
    if (!company || !company.rhConfig || !company.rhConfig.internalHours) return Boom.notFound(translate[language].companyInternalHourNotFound);

    const internalHour = company.rhConfig.internalHours.find(hour => hour._id.toHexString() === req.params.internalHourId);
    if (!internalHour) return Boom.notFound(translate[language].companyInternalHourNotFound);
    if (internalHour.default) return Boom.forbidden();

    await Company.findOneAndUpdate(
      { _id: req.params._id },
      { $pull: { 'rhConfig.internalHours': { _id: req.params.internalHourId } } },
    );

    return {
      message: translate[language].companyInternalHourRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  show,
  create,
  update,
  remove,
  uploadFile,
  getCompanyServices,
  createCompanyService,
  deleteCompanyService,
  updateCompanyService,
  addInternalHour,
  updateInternalHour,
  getInternalHours,
  removeInternalHour
};
