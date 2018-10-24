const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const Company = require('../models/Company');

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
    if (!company) {
      return Boom.notFound(translate[language].companyNotFound);
    }
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
      data: {
        company: newCompany
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

const update = async (req) => {
  try {
    const companyUpdated = await Company.findOneAndUpdate({ _id: req.params._id }, { $set: flat(req.payload) }, { new: true });
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
    return {
      message: translate[language].companyDeleted
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
  remove
};
