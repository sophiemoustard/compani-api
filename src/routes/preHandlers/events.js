const Boom = require('@hapi/boom');
const get = require('lodash/get');
const moment = require('moment');
const Event = require('../../models/Event');
const CreditNote = require('../../models/CreditNote');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const Sector = require('../../models/Sector');
const UserCompany = require('../../models/UserCompany');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const {
  AUXILIARY,
  INTERVENTION,
} = require('../../helpers/constants');

const { language } = translate;

exports.getEvent = async (req) => {
  const event = await Event.findOne({ _id: req.params._id, company: get(req, 'auth.credentials.company._id') })
    .populate({ path: 'startDateTimeStamp' })
    .populate({ path: 'endDateTimeStamp' })
    .lean();

  if (!event) throw Boom.notFound(translate[language].eventNotFound);

  return event;
};

exports.authorizeEventGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  if (req.query.customer) {
    const customerIds = [...new Set(UtilsHelper.formatIdsArray(req.query.customer))];
    const customerCount = await Customer.countDocuments({ _id: { $in: customerIds }, company: companyId });
    if (customerCount !== customerIds.length) throw Boom.notFound();
  }

  if (req.query.auxiliary) {
    const auxiliariesIds = [...new Set(UtilsHelper.formatIdsArray(req.query.auxiliary))];
    const auxiliariesCount = await UserCompany.countDocuments({ user: { $in: auxiliariesIds }, company: companyId });
    if (auxiliariesCount !== auxiliariesIds.length) throw Boom.notFound();
  }

  if (req.query.sector) {
    const sectorsIds = [...new Set(UtilsHelper.formatIdsArray(req.query.sector))];
    const sectorCount = await Sector.countDocuments({ _id: { $in: sectorsIds }, company: companyId });
    if (sectorCount !== sectorsIds.length) throw Boom.notFound();
  }

  return null;
};

exports.authorizeEventForCreditNoteGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.countDocuments({ _id: req.query.customer, company: companyId });
  if (!customer) throw Boom.notFound();

  const { creditNoteId, startDate, endDate } = req.query;
  let creditNote = null;
  if (creditNoteId) {
    creditNote = await CreditNote.findOne({ _id: req.query.creditNoteId, company: companyId }).lean();
    if (!creditNote) throw Boom.notFound();
    if (creditNote.events.some(e => e.startDate < startDate && e.endDate > endDate)) throw Boom.badData();
  }

  if (req.query.thirdPartyPayer) {
    const tpp = await ThirdPartyPayer.countDocuments({ _id: req.query.thirdPartyPayer, company: companyId });
    if (!tpp) throw Boom.notFound();
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

  if (event.customer) {
    const customer = await Customer.countDocuments({ _id: event.customer, archivedAt: { $exists: true, $ne: null } });
    if (customer) throw Boom.forbidden();
  }
  return event;
};

exports.authorizeTimeStamping = async (req) => {
  const event = await Event.findOne({
    _id: req.params._id,
    type: INTERVENTION,
    auxiliary: get(req, 'auth.credentials._id'),
    startDate: { $gte: moment().startOf('d').toDate(), $lte: moment().endOf('d').toDate() },
  })
    .populate({ path: 'startDateTimeStamp' })
    .populate({ path: 'endDateTimeStamp' })
    .lean();
  if (!event) throw Boom.notFound();

  if (event.isCancelled) { throw Boom.conflict(translate[language].timeStampCancelledEvent); }

  if ((event.startDateTimeStamp && req.payload.startDate) || (event.endDateTimeStamp && req.payload.endDate)) {
    throw Boom.conflict(translate[language].alreadyTimeStamped);
  }

  return null;
};
