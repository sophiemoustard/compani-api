const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const EventsHelper = require('../helpers/events');
const { deleteRepetition } = require('../helpers/eventsRepetition');

const { language } = translate;

const list = async (req) => {
  try {
    const events = await EventsHelper.list(req.query, req.auth.credentials);
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
    const events = await EventsHelper.listForCreditNotes(req.query, req.auth.credentials, req.pre.creditNote);
    console.log(events);
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
    const event = await EventsHelper.createEvent(payload, auth.credentials);

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

    event = await EventsHelper.updateEvent(event, payload, auth.credentials);

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
    const event = await EventsHelper.deleteEvent(pre.event, auth.credentials);
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

const deleteList = async (req) => {
  try {
    const { query, auth } = req;

    await EventsHelper.deleteList(query.customer, query.startDate, query.endDate, auth.credentials);

    return { message: translate[language].eventsDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getWorkingStats = async (req) => {
  try {
    const { query, auth } = req;
    const stats = await EventsHelper.workingStats(query, auth.credentials);

    return {
      message: translate[language].hoursBalanceDetail,
      data: { workingStats: stats },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getPaidTransportStatsBySector = async (req) => {
  try {
    const paidTransportStatsBySector = await EventsHelper.getPaidTransportStatsBySector(
      req.query,
      req.auth.credentials
    );

    return {
      message: translate[language].statsFound,
      data: { paidTransportStatsBySector },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getUnassignedHoursBySector = async (req) => {
  try {
    const unassignedHoursBySector = await EventsHelper.getUnassignedHoursBySector(req.query, req.auth.credentials);

    return {
      message: translate[language].statsFound,
      data: { unassignedHoursBySector },
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
  deleteList,
  listForCreditNotes,
  getWorkingStats,
  getPaidTransportStatsBySector,
  getUnassignedHoursBySector,
};
