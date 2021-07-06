const Boom = require('@hapi/boom');
const get = require('lodash/get');
const cloneDeep = require('lodash/cloneDeep');
const moment = require('moment');
const Event = require('../../models/Event');
const CreditNote = require('../../models/CreditNote');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const Sector = require('../../models/Sector');
const EventHistory = require('../../models/EventHistory');
const InternalHour = require('../../models/InternalHour');
const UserCompany = require('../../models/UserCompany');
const { TIME_STAMPING_ACTIONS } = require('../../models/EventHistory');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const {
  AUXILIARY,
  MATERNITY_LEAVE,
  PATERNITY_LEAVE,
  PARENTAL_LEAVE,
  WORK_ACCIDENT,
  TRANSPORT_ACCIDENT,
  ILLNESS,
  INTERVENTION,
} = require('../../helpers/constants');

const { language } = translate;

exports.getEvent = async (req) => {
  const event = await Event.findById(req.params._id)
    .populate('startDateTimeStampedCount')
    .populate('endDateTimeStampedCount')
    .lean();

  if (!event) throw Boom.notFound(translate[language].eventNotFound);

  return event;
};

exports.authorizeEventGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  if (req.query.customer) {
    const customerIds = [...new Set(UtilsHelper.formatIdsArray(req.query.customer))];
    const customerCount = await Customer.countDocuments({ _id: { $in: customerIds }, company: companyId });
    if (customerCount !== customerIds.length) throw Boom.forbidden();
  }

  if (req.query.auxiliary) {
    const auxiliariesIds = [...new Set(UtilsHelper.formatIdsArray(req.query.auxiliary))];
    const auxiliariesCount = await UserCompany.countDocuments({ user: { $in: auxiliariesIds }, company: companyId });
    if (auxiliariesCount !== auxiliariesIds.length) throw Boom.notFound();
  }

  if (req.query.sector) {
    const sectorsIds = [...new Set(UtilsHelper.formatIdsArray(req.query.sector))];
    const sectorCount = await Sector.countDocuments({ _id: { $in: sectorsIds }, company: companyId });
    if (sectorCount !== sectorsIds.length) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeEventForCreditNoteGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findOne({ _id: req.query.customer, company: companyId }).lean();
  if (!customer) throw Boom.forbidden();

  const { creditNoteId, startDate, endDate } = req.query;
  let creditNote = null;
  if (creditNoteId) {
    creditNote = await CreditNote.findOne({ _id: req.query.creditNoteId });
    if (creditNote.events.some(e => e.startDate < startDate && e.endDate > endDate)) throw Boom.badData();
  }

  if (req.query.thirdPartyPayer) {
    const tpp = await ThirdPartyPayer.findOne({ _id: req.query.thirdPartyPayer, company: companyId }).lean();
    if (!tpp) throw Boom.forbidden();
  }

  return creditNote;
};

const checkAuxiliaryPermission = (credentials, event) => {
  const { auxiliary, sector } = event;
  const isOwnEvent = auxiliary && UtilsHelper.areObjectIdsEquals(auxiliary, credentials._id);
  const eventIsUnassignedAndFromSameSector = sector && UtilsHelper.areObjectIdsEquals(sector, credentials.sector);

  if (!isOwnEvent && !eventIsUnassignedAndFromSameSector) throw Boom.forbidden();

  return null;
};

exports.authorizeEventDeletion = async (req) => {
  const { credentials } = req.auth;
  const event = await exports.getEvent(req);

  const isAuxiliary = get(credentials, 'role.client.name') === AUXILIARY;
  if (isAuxiliary) {
    if (event.auxiliary) event.auxiliary = event.auxiliary.toHexString();
    if (event.sector) event.sector = event.sector.toHexString();
    checkAuxiliaryPermission(credentials, event);
  }

  const companyId = get(req, 'auth.credentials.company._id', null);
  if (!UtilsHelper.areObjectIdsEquals(event.company, companyId)) throw Boom.forbidden();

  return event;
};

exports.authorizeEventCreation = async (req) => {
  const { credentials } = req.auth;
  const { payload } = req;

  const isAuxiliary = get(credentials, 'role.client.name') === AUXILIARY;
  if (isAuxiliary) checkAuxiliaryPermission(credentials, payload);

  return exports.checkEventCreationOrUpdate(req);
};

exports.authorizeEventUpdate = async (req) => {
  const { credentials } = req.auth;
  const event = cloneDeep(req.pre.event);

  const isAuxiliary = get(credentials, 'role.client.name') === AUXILIARY;
  if (isAuxiliary) {
    if (event.auxiliary) event.auxiliary = event.auxiliary.toHexString();
    if (event.sector) event.sector = event.sector.toHexString();
    checkAuxiliaryPermission(credentials, event);
  }

  return exports.checkEventCreationOrUpdate(req);
};

exports.checkEventCreationOrUpdate = async (req) => {
  const { credentials } = req.auth;
  const event = req.pre.event || req.payload;
  const companyId = get(credentials, 'company._id', null);

  if (req.pre.event && !UtilsHelper.areObjectIdsEquals(event.company, companyId)) throw Boom.forbidden();

  if (req.payload.customer || (event.customer && req.payload.subscription)) {
    const customerId = req.payload.customer || event.customer;
    const customer = await Customer.findOne(({ _id: customerId, company: companyId }))
      .populate('subscriptions.service')
      .lean();
    if (!customer) throw Boom.forbidden();

    const customerSub = customer.subscriptions.find(sub =>
      UtilsHelper.areObjectIdsEquals(sub._id, req.payload.subscription));
    if (!customerSub) throw Boom.forbidden();

    const eventHaveSameSub = req.pre.event &&
      UtilsHelper.areObjectIdsEquals(req.pre.event.subscription, req.payload.subscription);
    if (!eventHaveSameSub && get(customerSub, 'service.isArchived')) throw Boom.forbidden();
  }

  if (req.payload.auxiliary) {
    const auxiliary = await UserCompany.countDocuments(({ user: req.payload.auxiliary, company: companyId }));
    if (!auxiliary) throw Boom.notFound();
  }

  if (req.payload.sector) {
    const sector = await Sector.countDocuments(({ _id: req.payload.sector, company: companyId }));
    if (!sector) throw Boom.forbidden();
  }

  if (req.payload.internalHour) {
    const internalHour = await InternalHour.countDocuments(({ _id: req.payload.internalHour, company: companyId }));
    if (!internalHour) throw Boom.forbidden();
  }

  if (req.payload.extension) {
    if (![MATERNITY_LEAVE, PATERNITY_LEAVE, PARENTAL_LEAVE, WORK_ACCIDENT, TRANSPORT_ACCIDENT, ILLNESS]
      .includes(req.payload.absence)) throw Boom.forbidden();

    const extendedAbsence = await Event.findOne(({ _id: req.payload.extension, absence: req.payload.absence })).lean();
    if (!extendedAbsence) throw Boom.forbidden();
    if (extendedAbsence.startDate > req.payload.startDate) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeEventDeletionList = async (req) => {
  const { credentials } = req.auth;

  const isAuxiliary = get(credentials, 'role.client.name') === AUXILIARY;
  if (isAuxiliary) throw Boom.forbidden();

  const customer = await Customer.findOne({
    _id: req.query.customer,
    company: get(credentials, 'company._id', null),
  }).lean();
  if (!customer) throw Boom.forbidden();
  return null;
};

exports.authorizeTimeStamping = async (req) => {
  const event = await Event.findOne({
    _id: req.params._id,
    type: INTERVENTION,
    auxiliary: get(req, 'auth.credentials._id'),
    startDate: { $gte: moment().startOf('d').toDate(), $lte: moment().endOf('d').toDate() },
  }).lean();
  if (!event) throw Boom.notFound();

  if (event.isCancelled) { throw Boom.conflict(translate[language].timeStampCancelledEvent); }

  const timeStampPayload = { 'event.eventId': req.params._id, action: { $in: TIME_STAMPING_ACTIONS } };

  if (req.payload.startDate) timeStampPayload['update.startHour'] = { $exists: true };
  else timeStampPayload['update.endHour'] = { $exists: true };

  const alreadyTimeStamped = await EventHistory.countDocuments(timeStampPayload);
  if (alreadyTimeStamped) throw Boom.conflict(translate[language].alreadyTimeStamped);

  return null;
};
