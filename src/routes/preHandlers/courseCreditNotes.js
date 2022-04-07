const Boom = require('@hapi/boom');
const CourseBill = require('../../models/CourseBill');
const Company = require('../../models/Company');

exports.authorizeCourseCreditNoteCreation = async (req) => {
  const { company: companyId, courseBill: courseBillId } = req.payload;

  const companyExist = await Company.countDocuments({ _id: companyId });
  if (!companyExist) throw Boom.notFound();

  const courseBill = await CourseBill.findOne({ _id: courseBillId }).lean();
  if (!courseBill) throw Boom.notFound();
  if (!courseBill.billedAt) throw Boom.forbidden();

  return null;
};
