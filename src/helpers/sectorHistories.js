const moment = require('moment');
const SectorHistory = require('../models/SectorHistory');
const User = require('../models/User');

exports.createHistory = async (auxiliary, sector, company) => {
  const lastHistory = await SectorHistory.findOne({ auxiliary, company, endDate: { $exists: false } })
    .sort({ startDate: -1 })
    .lean();
  if (!lastHistory) return SectorHistory.create({ auxiliary, sector, company });

  let startDate = moment().startOf('day');
  const user = await User
    .findOne({ _id: auxiliary })
    .populate({
      path: 'contracts',
      match: { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startDate.toDate() } }] },
      sort: { startDate: -1 },
    })
    .lean();

  let hasContract = false;
  let isNewContract = false;
  if (user.contracts.length) {
    hasContract = true;
    const contract = user.contracts[user.contracts.length - 1];
    if (moment(contract.createdAt).isSame(startDate, 'day')) {
      isNewContract = true;
      startDate = moment(contract.createdAt).startOf('day');
    }
  }

  if ((lastHistory.sector.toHexString() === sector && !isNewContract)
    || (!lastHistory.endDate && isNewContract && user.contracts.length > 1)) return;

  const endDate = moment().subtract(1, 'd').endOf('day').toDate();
  const hadSectorWithoutContract = !lastHistory.endDate && isNewContract;
  if (moment(endDate).isSameOrBefore(lastHistory.startDate) || !hasContract || hadSectorWithoutContract) {
    await SectorHistory.deleteOne({ _id: lastHistory._id });
  } else {
    await SectorHistory.updateOne({ _id: lastHistory._id }, { $set: { endDate } });
  }

  return SectorHistory.create({ auxiliary, sector, company, startDate: startDate.toDate() });
};

exports.updateEndDate = async (auxiliary, endDate) =>
  SectorHistory.updateOne(
    { auxiliary, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
    { $set: { endDate: moment(endDate).endOf('day').toDate() } }
  );
