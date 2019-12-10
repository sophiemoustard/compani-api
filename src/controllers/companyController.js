const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const { addFile } = require('../helpers/gdriveStorage');
const CompanyHelper = require('../helpers/companies');
const Company = require('../models/Company');
const drive = require('../models/Google/Drive');

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
      companyUpdated = await Company.findOneAndUpdate(
        { _id: req.params._id },
        { $set: flat(req.payload) },
        { new: true }
      );
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
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const newCompany = await CompanyHelper.createCompany(req.payload);

    return {
      message: translate[language].companyCreated,
      data: { company: newCompany },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  update,
  uploadFile,
  create,
};
