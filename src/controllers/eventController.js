const Boom = require('boom');
const moment = require('moment');
const Event = require('../models/Event');
const translate = require('../helpers/translate');
const {
  getListQuery,
  populateEvents,
  updateEvent,
  createEvent,
  deleteEvent,
} = require('../helpers/events');
const { isEditionAllowed } = require('../helpers/eventsValidation');
const { deleteRepetition } = require('../helpers/eventsRepetition');
const { ABSENCE, INTERVENTION, AUXILIARY, CUSTOMER } = require('../helpers/constants');
const { getEventsGroupedByAuxiliaries, getEventsGroupedByCustomers, getEventList } = require('../repositories/EventRepository');

const { language } = translate;

const list = async (req) => {
  try {
    const query = getListQuery(req.query);
    const { groupBy } = req.query;

    let events;
    if (groupBy === CUSTOMER) {
      events = await getEventsGroupedByCustomers(query);
    } else if (groupBy === AUXILIARY) {
      events = await getEventsGroupedByAuxiliaries(query);
    } else {
      events = await getEventList(query, req.auth.credentials);
      events = await populateEvents(events);
    }

    return {
      message: events.length === 0 ? translate[language].eventsNotFound : translate[language].eventsFound,
      data: { events },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listForCreditNotes = async (req) => {
  try {
    let query = {
      startDate: { $gte: moment(req.query.startDate).startOf('d').toDate() },
      endDate: { $lte: moment(req.query.endDate).endOf('d').toDate() },
      customer: req.query.customer,
      isBilled: req.query.isBilled,
      type: INTERVENTION,
    };
    if (req.query.thirdPartyPayer) query = { ...query, 'bills.thirdPartyPayer': req.query.thirdPartyPayer };
    else query = { ...query, 'bills.inclTaxesCustomer': { $exists: true, $gt: 0 }, 'bills.inclTaxesTpp': { $exists: false } };
    const events = await Event.find(query).lean();

    return {
      message: events.length === 0 ? translate[language].eventsNotFound : translate[language].eventsFound,
      data: { events },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const { payload, auth } = req;
    const event = await createEvent(payload, auth.credentials);

    return {
      message: translate[language].eventCreated,
      data: { event },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const { payload, auth } = req;

    let { event } = req.pre;

    if (event.type !== ABSENCE && !moment(payload.startDate).isSame(payload.endDate, 'day')) {
      throw Boom.badRequest(translate[language].eventDatesNotOnSameDay);
    }

    if (!(await isEditionAllowed(event, payload))) return Boom.badData();

    event = await updateEvent(event, payload, auth.credentials);

    return {
      message: translate[language].eventUpdated,
      data: { event },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    const { auth, pre } = req;
    const event = await deleteEvent(pre.event, auth.credentials);
    if (!event) return Boom.notFound(translate[language].eventNotFound);

    return { message: translate[language].eventDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const removeRepetition = async (req) => {
  try {
    const { auth, pre } = req;
    const event = await deleteRepetition(pre.event, auth.credentials);

    return {
      message: translate[language].eventDeleted,
      data: { event },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
  removeRepetition,
  listForCreditNotes,
};
