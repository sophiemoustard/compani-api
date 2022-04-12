const Boom = require('@hapi/boom');
const Company = require('../../models/Company');
const CourseBill = require('../../models/CourseBill');
const CoursePayment = require('../../models/CoursePayment');

exports.authorizeCoursePaymentCreation = async (req) => {
  try {
    const { courseBill: courseBillId, company } = req.payload;

    const companyExists = await Company.countDocuments({ _id: company });
    if (!companyExists) throw Boom.notFound();

    const courseBill = await CourseBill.findOne({ _id: courseBillId }, { billedAt: 1 }).lean();
    if (!courseBill) throw Boom.notFound();
    if (!courseBill.billedAt) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCoursePaymentUpdate = async (req) => {
  try {
    const coursePaymentExists = await CoursePayment.countDocuments({ _id: req.params._id });
    if (!coursePaymentExists) throw Boom.notFound();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
