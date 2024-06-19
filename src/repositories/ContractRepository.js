const Contract = require('../models/Contract');

exports.getStaffRegister = async companyId => Contract
  .find({ company: companyId })
  .populate({
    path: 'user',
    select: 'identity administrative.idCardRecto administrative.idCardVerso administrative.residencePermitRecto '
     + 'administrative.residencePermitVerso',
  })
  .lean();
