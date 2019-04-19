const Boom = require('boom');
const flat = require('flat');
const moment = require('moment');
const Event = require('../models/Event');
const GoogleDrive = require('../models/Google/Drive');
const translate = require('../helpers/translate');
const { addFile } = require('../helpers/gdriveStorage');
const {
  isCreationAllowed,
  getListQuery,
  populateEvents,
  populateEventSubscription,
  createRepetitions,
  updateRepetitions,
  deleteRepetition
} = require('../helpers/events');
const { ABSENCE, NEVER, INTERVENTION } = require('../helpers/constants');

const { language } = translate;

const list = async (req) => {
  try {
    const query = getListQuery(req);
    const events = await Event.find(query)
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder administrative.transportInvoice company picture' })
      .populate({
        path: 'customer',
        select: 'identity subscriptions contact',
        populate: { path: 'subscriptions.service' }
      })
      .lean();
    if (events.length === 0) {
      return {
        message: translate[language].eventsNotFound,
        data: { events: [] }
      };
    }

    const populatedEvents = await populateEvents(events);

    return {
      message: translate[language].eventsFound,
      data: { events: populatedEvents }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
      data: { events }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    if (!(await isCreationAllowed(req.payload))) return Boom.badData();

    let event = new Event(req.payload);
    await event.save();
    event = await Event.findOne({ _id: event._id })
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder administrative.transportInvoice company' })
      .populate({ path: 'customer', select: 'identity subscriptions contact' })
      .lean();

    if (event.type !== ABSENCE && req.payload.repetition && req.payload.repetition.frequency !== NEVER) {
      event = await createRepetitions(event);
    }

    const populatedEvent = await populateEventSubscription(event);

    return {
      message: translate[language].eventCreated,
      data: { event: populatedEvent },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    let event = await Event.findOne({ _id: req.params._id });
    if (!event) return Boom.notFound(translate[language].eventNotFound);

    event = { ...event.toObject(), ...req.payload };
    if (!(await isCreationAllowed(event))) return Boom.badData();

    event = await Event
      .findOneAndUpdate(
        { _id: req.params._id },
        { $set: flat(req.payload) },
        { autopopulate: false, new: true }
      )
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder administrative.transportInvoice company picture' })
      .populate({ path: 'customer', select: 'identity subscriptions contact' })
      .lean();


    const { type, repetition } = event;
    if (req.payload.shouldUpdateRepetition && type !== ABSENCE && repetition && repetition.frequency !== NEVER) {
      await updateRepetitions(event, req.payload);
    }

    const populatedEvent = await populateEventSubscription(event);

    return {
      message: translate[language].eventUpdated,
      data: { event: populatedEvent },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const event = await Event.findByIdAndRemove({ _id: req.params._id });
    if (!event) return Boom.notFound(translate[language].eventNotFound);

    return { message: translate[language].eventDeleted, };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeRepetition = async (req) => {
  try {
    const event = await Event.findByIdAndRemove({ _id: req.params._id });
    if (!event) return Boom.notFound(translate[language].eventNotFound);

    const { type, repetition } = event;
    if (type !== ABSENCE && repetition && repetition.frequency !== NEVER) {
      await deleteRepetition(event);
    }

    return {
      message: translate[language].eventDeleted,
      data: { event }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
    return Boom.badImplementation();
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
