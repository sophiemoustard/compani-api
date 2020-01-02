const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const CompanyHelper = require('../helpers/companies');
const Company = require('../models/Company');

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
    const company = await CompanyHelper.uploadFile(req.payload, req.params);
    return { message: translate[language].fileCreated, data: { company } };
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

const getFirstIntervention = async (req) => {
  try {
    const firstIntervention = await CompanyHelper.getFirstIntervention(req.auth.credentials);

    return {
      message: firstIntervention
        ? translate[language].companyFirstInterventionFound
        : translate[language].companyFirstInterventionNotFound,
      data: { firstIntervention: firstIntervention.startDate },
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
  getFirstIntervention,
};
