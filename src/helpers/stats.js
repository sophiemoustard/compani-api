const { ObjectId } = require('mongodb');
const get = require('lodash/get');
const UtilsHelper = require('./utils');
const { CompaniDate } = require('./dates/companiDates');
const SectorHistoryRepository = require('../repositories/SectorHistoryRepository');

exports.getPaidInterventionStats = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  if (query.sector) {
    const sectors = UtilsHelper.formatObjectIdsArray(query.sector);
    const startOfMonth = CompaniDate(query.month, 'MM-yyyy').startOf('month').toISO();
    const endOfMonth = CompaniDate(query.month, 'MM-yyyy').endOf('month').toISO();
    const auxiliariesFromSectorHistories = await SectorHistoryRepository.getUsersFromSectorHistories(
      startOfMonth,
      endOfMonth,
      sectors,
      companyId
    );
    return SectorHistoryRepository.getPaidInterventionStats(
      auxiliariesFromSectorHistories.map(aux => aux.auxiliaryId),
      query.month,
      companyId
    );
  }
  return SectorHistoryRepository.getPaidInterventionStats([new ObjectId(query.auxiliary)], query.month, companyId);
};
