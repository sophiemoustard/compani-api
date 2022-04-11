const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { CompaniDate } = require('../../helpers/dates/companiDates');
const Company = require('../../models/Company');
const CourseBill = require('../../models/CourseBill');
const CoursePayment = require('../../models/CoursePayment');

exports.authorizeCoursePaymentCreation = async (req) => {
  try {
    const { courseBill: courseBillId, company, date } = req.payload;

    const companyExists = await Company.countDocuments({ _id: company });
    if (!companyExists) throw Boom.notFound();

    const courseBill = await CourseBill.findOne({ _id: courseBillId }, { billedAt: 1 }).lean();
    if (!courseBill) throw Boom.notFound();
    if (!courseBill.billedAt || CompaniDate(date).isBefore(courseBill.billedAt)) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCoursePaymentUpdate = async (req) => {
  try {
    const coursePayment = await CoursePayment.findOne({ _id: req.params._id }).lean();
    if (!coursePayment) throw Boom.notFound();

    const courseBill = await CourseBill.findOne({ _id: coursePayment.courseBill }).lean();
    if (get(req, 'payload.date') && CompaniDate(req.payload.date).isBefore(courseBill.billedAt)) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
