const Boom = require('@hapi/boom');
const get = require('lodash/get');
const cloneDeep = require('lodash/cloneDeep');
const Event = require('../../models/Event');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const Sector = require('../../models/Sector');
const User = require('../../models/User');
const InternalHour = require('../../models/InternalHour');
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
} = require('../../helpers/constants');

const { language } = translate;

exports.getEvent = async (req) => {
  try {
    const event = await Event.findById(req.params._id).lean();
    if (!event) throw Boom.notFound(translate[language].eventNotFound);

    return event;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeEventGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  if (req.query.customer) {
    const customerIds = UtilsHelper.formatIdsArray(req.query.customer);
    const customerCount = await Customer.countDocuments({ _id: { $in: customerIds }, company: companyId });
    if (customerCount !== customerIds.length) throw Boom.forbidden();
  }

  if (req.query.auxiliary) {
    const auxiliariesIds = UtilsHelper.formatIdsArray(req.query.auxiliary);
    const auxiliariesCount = await User.countDocuments({ _id: { $in: auxiliariesIds }, company: companyId });
    if (auxiliariesCount !== auxiliariesIds.length) throw Boom.forbidden();
  }

  if (req.query.sector) {
    const sectorsIds = UtilsHelper.formatIdsArray(req.query.sector);
    const sectorCount = await Sector.countDocuments({ _id: { $in: sectorsIds }, company: companyId });
    if (sectorCount !== sectorsIds.length) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeEventForCreditNoteGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findOne({ _id: req.query.customer, company: companyId }).lean();
  if (!customer) throw Boom.forbidden();

  if (req.query.thirdPartyPayer) {
    const tpp = await ThirdPartyPayer.findOne({ _id: req.query.thirdPartyPayer, company: companyId }).lean();
    if (!tpp) throw Boom.forbidden();
  }

  return null;
};

const checkAuxiliaryPermission = (credentials, event) => {
  const isOwnEvent = event.auxiliary && event.auxiliary === credentials._id;
  const eventIsUnassignedAndFromSameSector = !event.auxiliary && event.sector && event.sector === credentials.sector;

  if (!isOwnEvent && !eventIsUnassignedAndFromSameSector) throw Boom.forbidden();
  return null;
};

exports.authorizeEventDeletion = async (req) => {
  const { credentials } = req.auth;
  const { event } = req.pre;

  const isAuxiliary = get(credentials, 'role.client.name') === AUXILIARY;
  if (isAuxiliary) {
    if (event.auxiliary) event.auxiliary = event.auxiliary.toHexString();
    if (event.sector) event.sector = event.sector.toHexString();
    checkAuxiliaryPermission(credentials, event);
  }

  const companyId = get(req, 'auth.credentials.company._id', null);
  if (event.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

  return null;
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

  if (req.pre.event && event.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

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
    const auxiliary = await User.countDocuments(({ _id: req.payload.auxiliary, company: companyId }));
    if (!auxiliary) throw Boom.forbidden();
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
      .includes(req.payload.absence)) throw Boom.forbidden('extension');

    const extendedAbsence = await Event.findOne(({
      _id: req.payload.extension,
      absence: req.payload.absence,
    })).lean();
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
