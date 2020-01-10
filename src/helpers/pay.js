const cloneDeep = require('lodash/cloneDeep');
const get = require('lodash/get');
const Boom = require('boom');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Pay = require('../models/Pay');
const User = require('../models/User');
const Company = require('../models/Company');
const DistanceMatrix = require('../models/DistanceMatrix');
const Surcharge = require('../models/Surcharge');
const DraftPayHelper = require('./draftPay');
const ContractHelper = require('./contracts');
const EventRepository = require('../repositories/EventRepository');
const SectorHistoryRepository = require('../repositories/SectorHistoryRepository');
const { COMPANY_CONTRACT } = require('./constants');

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
  const isCompanyContract = cont.status === COMPANY_CONTRACT;
  if (!isCompanyContract) return false;

  const contractStarted = moment(cont.startDate).isSameOrBefore(endDate);
  if (!contractStarted) return false;

  return !cont.endDate || moment(cont.endDate).isSameOrAfter(startDate);
});

exports.hoursBalanceDetail = async (auxiliaryId, month, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();
  const auxiliaryEvents = await EventRepository.getEventsToPay(
    startDate,
    endDate,
    [new ObjectID(auxiliaryId)],
    companyId
  );

  const pay = await Pay.findOne({ auxiliary: auxiliaryId, month }).lean();
  if (pay) return pay;

  const auxiliary = await User.findOne({ _id: auxiliaryId }).populate('contracts').lean();
  const prevMonth = moment(month, 'MM-YYYY').subtract(1, 'M').format('MM-YYYY');
  const prevPay = await Pay.findOne({ month: prevMonth, auxiliary: auxiliaryId }).lean();
  const query = { startDate, endDate };
  const [company, surcharges, distanceMatrix] = await Promise.all([
    Company.findOne({ _id: companyId }).lean(),
    Surcharge.find({ company: companyId }).lean(),
    DistanceMatrix.find({ company: companyId }).lean(),
  ]);

  const prevPayList = await DraftPayHelper.getPreviousMonthPay(
    [{ ...auxiliary, prevPay }],
    query,
    surcharges,
    distanceMatrix,
    companyId
  );
  const prevPayWithDiff = prevPayList.length ? prevPayList[0] : null;
  const contract = exports.getContract(auxiliary.contracts, startDate, endDate);
  if (!contract) throw Boom.badRequest();

  const events = auxiliaryEvents[0] ? auxiliaryEvents[0] : { events: [], absences: [] };
  const draft = await DraftPayHelper.computeAuxiliaryDraftPay(
    auxiliary,
    contract,
    events,
    prevPayWithDiff,
    company,
    query,
    distanceMatrix,
    surcharges
  );

  return draft || null;
};

const changeVersion = (version, sector) => {
  let { startDate, endDate } = version;
  if (moment(sector.startDate).isAfter(version.startDate)) ({ startDate } = sector);
  if (sector.endDate && (!version.endDate || moment(sector.endDate).isBefore(version.endDate))) ({ endDate } = sector);

  return { ...version, startDate, endDate };
};

exports.computeHoursToWork = (month, contracts) => {
  const contractsInfoSum = { contractHours: 0, holidaysHours: 0, absencesHours: 0 };

  for (const contract of contracts) {
    const contractQuery = {
      startDate: moment.max(moment(month, 'MMYYYY').startOf('M'), moment(contract.sector.startDate)).toDate(),
      endDate: contract.sector.endDate
        ? moment.min(moment(month, 'MMYYYY').endOf('M'), moment(contract.sector.endDate)).toDate()
        : moment(month, 'MMYYYY').endOf('M'),
    };

    let versions = ContractHelper.getMatchingVersionsList(contract.versions || [], contractQuery);
    versions = versions.map(version => changeVersion(version, contract.sector));
    const contractConsideringSectorChange = { ...contract, versions };

    const contractInfo = DraftPayHelper.getContractMonthInfo(contractConsideringSectorChange, contractQuery);
    contractsInfoSum.contractHours += contractInfo.contractHours;
    contractsInfoSum.holidaysHours += contractInfo.holidaysHours;
    if (contractConsideringSectorChange.absences.length) {
      contractsInfoSum.absencesHours += DraftPayHelper.getPayFromAbsences(
        contractConsideringSectorChange.absences,
        contractConsideringSectorChange,
        contractQuery
      );
    }
  }

  return Math.max(contractsInfoSum.contractHours - contractsInfoSum.holidaysHours - contractsInfoSum.absencesHours, 0);
};

exports.getHoursToWorkBySector = async (query, credentials) => {
  const hoursToWorkBySector = [];
  const sectors = Array.isArray(query.sector) ? query.sector.map(id => new ObjectID(id)) : [new ObjectID(query.sector)];

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
