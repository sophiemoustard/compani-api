const Boom = require('@hapi/boom');
const CourseBillHelper = require('../helpers/courseBills');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const courseBills = await CourseBillHelper.list(req.query.course, req.auth.credentials);

    return {
      message: courseBills.length
        ? translate[language].courseBillsFound
        : translate[language].courseBillsNotFound,
      data: { courseBills },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const courseBill = await CourseBillHelper.create(req.payload);

    return {
      message: translate[language].courseBillCreated,
      data: { courseBill },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await CourseBillHelper.updateCourseBill(req.params._id, req.payload);

    return { message: translate[language].courseBillUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addBillingPurchase = async (req) => {
  try {
    await CourseBillHelper.addBillingPurchase(req.params._id, req.payload);

    return { message: translate[language].courseBillUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, create, update, addBillingPurchase };
