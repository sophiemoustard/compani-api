const Contract = require('../models/Contract');

exports.getUserContracts = async (contractUserId, companyId) => Contract.find(
  { company: companyId, user: contractUserId },
  { endDate: 1 },
  { sort: { endDate: -1 } }
).lean();

exports.getStaffRegister = async companyId => Contract
  .find({ company: companyId })
  .populate({
    path: 'user',
    select: 'identity administrative.idCardRecto administrative.idCardVerso administrative.residencePermitRecto '
     + 'administrative.residencePermitVerso',
  })
  .lean();
