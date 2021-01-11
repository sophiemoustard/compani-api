const cloneDeep = require('lodash/cloneDeep');
const get = require('lodash/get');
const Boom = require('@hapi/boom');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Pay = require('../models/Pay');
const User = require('../models/User');
const Company = require('../models/Company');
const DistanceMatrix = require('../models/DistanceMatrix');
const Surcharge = require('../models/Surcharge');
const DraftPayHelper = require('./draftPay');
const ContractHelper = require('./contracts');
const UtilsHelper = require('./utils');
const EventRepository = require('../repositories/EventRepository');
const SectorHistoryRepository = require('../repositories/SectorHistoryRepository');
const SectorHistory = require('../models/SectorHistory');

exports.formatSurchargeDetail = (detail) => {
  const surchargeDetail = [];
  for (const key of Object.keys(detail)) {
    surchargeDetail.push({ ...detail[key], planId: key });
  }

  return surchargeDetail;
};

exports.formatPay = (draftPay, companyId) => {
  const payload = { ...cloneDeep(draftPay), company: companyId };
  const keys = ['surchargedAndNotExemptDetails', 'surchargedAndExemptDetails'];
  for (const key of keys) {
    if (draftPay[key]) {
      payload[key] = exports.formatSurchargeDetail(draftPay[key]);
    }
    if (draftPay.diff && draftPay.diff[key]) {
      payload.diff[key] = exports.formatSurchargeDetail(draftPay.diff[key]);
    }
  }

  return payload;
};

exports.createPayList = async (payToCreate, credentials) => {
  const list = [];
  const companyId = get(credentials, 'company._id', null);
  for (const pay of payToCreate) {
    list.push(new Pay(this.formatPay(pay, companyId)));
  }

  await Pay.insertMany(list);
};

exports.getContract = (contracts, startDate, endDate) => contracts.find((cont) => {
  const contractStarted = moment(cont.startDate).isSameOrBefore(endDate);
  if (!contractStarted) return false;

  return !cont.endDate || moment(cont.endDate).isSameOrAfter(startDate);
});

exports.hoursBalanceDetail = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const startDate = moment(query.month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(query.month, 'MM-YYYY').endOf('M').toDate();

  if (query.sector) return this.hoursBalanceDetailBySector(query.sector, startDate, endDate, companyId);

  return this.hoursBalanceDetailByAuxiliary(query.auxiliary, startDate, endDate, companyId);
};

exports.hoursBalanceDetailByAuxiliary = async (auxiliaryId, startDate, endDate, companyId) => {
  const auxiliaryEvents = await EventRepository.getEventsToPay(
    startDate,
    endDate,
    [new ObjectID(auxiliaryId)],
    companyId
  );

  const month = moment(startDate).format('MM-YYYY');
  const pay = await Pay.findOne({ auxiliary: auxiliaryId, month }).lean();
  if (pay) return pay;

  const auxiliary = await User.findOne({ _id: auxiliaryId }).populate('contracts').lean();
  const prevMonth = moment(month, 'MM-YYYY').subtract(1, 'M').format('MM-YYYY');
  const prevPay = await Pay.findOne({ month: prevMonth, auxiliary: auxiliaryId }).lean();
  const payQuery = { startDate, endDate };
  const [company, surcharges, distanceMatrix] = await Promise.all([
    Company.findOne({ _id: companyId }).lean(),
    Surcharge.find({ company: companyId }).lean(),
    DistanceMatrix.find({ company: companyId }).lean(),
  ]);

  const prevPayList = await DraftPayHelper.getPreviousMonthPay(
    [{ ...auxiliary, prevPay }],
    payQuery,
    surcharges,
    distanceMatrix,
    companyId
  );
  const prevPayWithDiff = prevPayList.length ? prevPayList[0] : null;
  const contract = exports.getContract(auxiliary.contracts, startDate, endDate);
  if (!contract) throw Boom.badRequest();

  const events = auxiliaryEvents[0] ? auxiliaryEvents[0] : { events: [], absences: [] };
  const sectors = await SectorHistory.find(
    {
      company: companyId,
      auxiliary: auxiliaryId,
      startDate: { $lt: endDate },
      $or: [{ endDate: { $gt: startDate } }, { endDate: { $exists: false } }],
    },
    { sector: 1 }
  ).lean() || [];

  const draft = await DraftPayHelper.computeAuxiliaryDraftPay(
    auxiliary,
    contract,
    events,
    prevPayWithDiff,
    company,
    payQuery,
    distanceMatrix,
    surcharges
  );

  return { ...draft, sectors: [...new Set(sectors.map(sh => sh.sector.toHexString()))] } || null;
};

exports.hoursBalanceDetailBySector = async (sector, startDate, endDate, companyId) => {
  const sectors = UtilsHelper.formatObjectIdsArray(sector);

  const auxiliariesIds = await SectorHistoryRepository.getUsersFromSectorHistories(
    startDate,
    endDate,
    sectors,
    companyId
  );
  const result = [];
  const auxiliaries = await User.find({ company: companyId, _id: { $in: auxiliariesIds.map(aux => aux.auxiliaryId) } })
    .populate('contracts')
    .lean();
  for (const auxiliary of auxiliaries) {
    if (!auxiliary.contracts) continue;

    const contract = exports.getContract(auxiliary.contracts, startDate, endDate);
    if (!contract) continue;

    const hbd = await exports.hoursBalanceDetailByAuxiliary(auxiliary._id, startDate, endDate, companyId);
    result.push({ ...hbd, auxiliaryId: auxiliary._id, identity: auxiliary.identity, picture: auxiliary.picture });
  }

  return result;
};

const updateVersionsWithSectorDates = (version, sector) => {
  const returnedVersion = {
    ...version,
    startDate: moment.max(moment(sector.startDate), moment(version.startDate)).startOf('d').toDate(),
  };

  if (version.endDate && sector.endDate) {
    returnedVersion.endDate = moment.min(moment(sector.endDate), moment(version.endDate)).endOf('d').toDate();
  } else if (sector.endDate) returnedVersion.endDate = moment(sector.endDate).endOf('d').toDate();

  return returnedVersion;
};

exports.computeHoursToWork = (month, contracts) => {
  const contractsInfoSum = { contractHours: 0, holidaysHours: 0, absencesHours: 0 };

  for (const contract of contracts) {
    const contractQuery = {
      startDate: moment.max(moment(month, 'MMYYYY').startOf('M'), moment(contract.sector.startDate)).toDate(),
      endDate: contract.sector.endDate
        ? moment.min(moment(month, 'MMYYYY').endOf('M'), moment(contract.sector.endDate)).toDate()
        : moment(month, 'MMYYYY').endOf('M').toDate(),
    };

    let versions = ContractHelper.getMatchingVersionsList(contract.versions || [], contractQuery);
    versions = versions.map(version => updateVersionsWithSectorDates(version, contract.sector));
    const contractWithSectorDates = { ...contract, versions };

    const contractInfo = DraftPayHelper.getContractMonthInfo(contractWithSectorDates, contractQuery);
    contractsInfoSum.contractHours += contractInfo.contractHours;
    contractsInfoSum.holidaysHours += contractInfo.holidaysHours;

    if (contractWithSectorDates.absences.length) {
      contractsInfoSum.absencesHours += DraftPayHelper.getPayFromAbsences(
        contractWithSectorDates.absences,
        contractWithSectorDates,
        contractQuery
      );
    }
  }

  return Math.max(contractsInfoSum.contractHours - contractsInfoSum.holidaysHours - contractsInfoSum.absencesHours, 0);
};

exports.getHoursToWorkBySector = async (query, credentials) => {
  const hoursToWorkBySector = [];
  const sectors = UtilsHelper.formatObjectIdsArray(query.sector);

  const contractsAndEventsBySector = await SectorHistoryRepository.getContractsAndAbsencesBySector(
    query.month,
    sectors,
    get(credentials, 'company._id', null)
  );

  for (const sector of contractsAndEventsBySector) {
    hoursToWorkBySector.push({
      sector: sector._id,
      hoursToWork: exports.computeHoursToWork(query.month, sector.contracts),
    });
  }

  return hoursToWorkBySector;
};
