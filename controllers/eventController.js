const Boom = require('boom');
const moment = require('moment');
const Event = require('../models/Event');
const GoogleDrive = require('../models/Google/Drive');
const translate = require('../helpers/translate');
const { addFile } = require('../helpers/gdriveStorage');
const {
  getListQuery,
  populateEvents,
  updateEvent,
  deleteRepetition,
  createEvent,
  deleteEvent,
} = require('../helpers/events');
const { isEditionAllowed } = require('../helpers/eventsValidation');
const { ABSENCE, INTERVENTION, AUXILIARY, CUSTOMER } = require('../helpers/constants');
const { getEventsGroupedByAuxiliaries, getEventsGroupedByCustomers, getEventList } = require('../repositories/EventRepository');

const { language } = translate;

const list = async (req) => {
  try {
    const query = getListQuery(req);
    const { groupBy } = req.query;

    let events;
    if (groupBy === CUSTOMER) {
      events = await getEventsGroupedByCustomers(query);
    } else if (groupBy === AUXILIARY) {
      events = await getEventsGroupedByAuxiliaries(query);
    } else {
      events = await getEventList(query);
      events = await populateEvents(events);
    }

    return {
      message: events.length === 0 ? translate[language].eventsNotFound : translate[language].eventsFound,
      data: { events },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const listForCreditNotes = async (req) => {
  try {
    let query = {
      startDate: { $gte: moment(req.query.startDate).startOf('d').toDate() },
      endDate: { $lte: moment(req.query.endDate).endOf('d').toDate() },
      customer: req.query.customer,
      isBilled: true,
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
    return Boom.badImplementation(e);
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

    let event = await Event.findOne({ _id: req.params._id }).lean();
    if (!event) return Boom.notFound(translate[language].eventNotFound);

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
    const { params, auth } = req;
    const event = await deleteEvent(params, auth.credentials);
    if (!event) return Boom.notFound(translate[language].eventNotFound);

    return { message: translate[language].eventDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const removeRepetition = async (req) => {
  try {
    const { params, auth } = req;
    const event = await deleteRepetition(params, auth.credentials);

    return {
      message: translate[language].eventDeleted,
      data: { event },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const uploadFile = async (req) => {
  try {
    if (!req.payload.proofOfAbsence) return Boom.forbidden(translate[language].uploadNotAllowed);

    const uploadedFile = await addFile({
      driveFolderId: req.params.driveId,
      name: req.payload.fileName,
      type: req.payload['Content-Type'],
      body: req.payload.proofOfAbsence,
    });
    const driveFileInfo = await GoogleDrive.getFileById({ fileId: uploadedFile.id });
    const file = { driveId: uploadedFile.id, link: driveFileInfo.webViewLink };

    const payload = { attachment: file };

    return {
      message: translate[language].fileCreated,
      data: { payload },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
  uploadFile,
  removeRepetition,
  listForCreditNotes,
};
