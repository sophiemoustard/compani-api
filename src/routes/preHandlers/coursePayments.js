const Boom = require('@hapi/boom');
const Company = require('../../models/Company');
const CourseBill = require('../../models/CourseBill');

exports.authorizeCoursePaymentCreation = async (req) => {
  try {
    const { courseBill: courseBillId, company } = req.payload;

    const companyExists = await Company.countDocuments({ _id: company });
    if (!companyExists) throw Boom.notFound();

    const courseBill = await CourseBill.findOne({ _id: courseBillId }).lean();
    if (!courseBill) throw Boom.notFound();
    if (!courseBill.billedAt) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
