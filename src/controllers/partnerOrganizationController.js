const Boom = require('@hapi/boom');
const omit = require('lodash/omit');
const translate = require('../helpers/translate');
const PartnerOrganizationsHelper = require('../helpers/partnerOrganizations');

const { language } = translate;

const create = async (req) => {
  try {
    await PartnerOrganizationsHelper.create(req.payload, req.auth.credentials);

    return { message: translate[language].partnerOrganizationCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    let partnerOrganizations = [];
    partnerOrganizations = await PartnerOrganizationsHelper.list(req.auth.credentials);
    const prescribedCustomer = partnerOrganizations
      .map(partnerOrganization => partnerOrganization.partners.map(partner => partner.customerPartners.length).flat());

    const prescribedCustomerCopy = [];

    prescribedCustomer.forEach((res) => {
      if (res.length === 0) prescribedCustomerCopy.push(0);
      else prescribedCustomerCopy.push(res);
    });

    console.log('prescribedCustomer', prescribedCustomerCopy);

    prescribedCustomerCopy.forEach((res) => {
      if (res.length !== 0) res.reduce((acc, val) => acc + val);
    });

    console.log('---prescribed:', prescribedCustomer);

    // const prescribedCustomerCount = prescribedCustomer.reduce((acc, value) => acc + value);

    return {
      message: translate[language].partnerOrganizationsFound,
      data: { partnerOrganizations },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getById = async (req) => {
  try {
    const partnerOrganization = await PartnerOrganizationsHelper
      .getPartnerOrganization(req.params._id, req.auth.credentials);

    return { message: translate[language].partnerOrganizationFound, data: { partnerOrganization } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await PartnerOrganizationsHelper.update(req.params._id, req.payload);

    return { message: translate[language].partnerOrganizationUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createPartner = async (req) => {
  try {
    await PartnerOrganizationsHelper.createPartner(req.params._id, req.payload, req.auth.credentials);

    return { message: translate[language].partnerCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list, getById, update, createPartner };
