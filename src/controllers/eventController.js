const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const EventsHelper = require('../helpers/events');
const EventTimeStampingHelper = require('../helpers/eventTimeStamping');
const { deleteRepetition } = require('../helpers/eventsRepetition');

const { language } = translate;

const list = async (req) => {
  try {
    req.log('eventController - list - query', req.query);
    req.log('eventController - list - company', get(req, 'auth.credentials.company._id'));

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

    return {
      message: events.length === 0 ? translate[language].eventsNotFound : translate[language].eventsFound,
      data: { events },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    const { auth, params } = req;
    await EventsHelper.deleteEvent(params._id, auth.credentials);

    return { message: translate[language].eventDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const removeRepetition = async (req) => {
  try {
    const { auth, pre } = req;
    await deleteRepetition(pre.event, auth.credentials);

    return { message: translate[language].eventDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getWorkingStats = async (req) => {
  try {
    req.log('eventController - getWorkingStats - query', req.query);
    req.log('eventController - getWorkingStats - company', get(req, 'auth.credentials.company._id'));

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

const timeStampEvent = async (req) => {
  try {
    await EventTimeStampingHelper.addTimeStamp(req.pre.event, req.payload, req.auth.credentials);

    return { message: translate[language].eventTimeStamped };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boolean.badImplementation(e);
  }
};

module.exports = {
  list,
  remove,
  removeRepetition,
  listForCreditNotes,
  getWorkingStats,
  timeStampEvent,
};
