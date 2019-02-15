const Boom = require('boom');
const moment = require('moment');
const _ = require('lodash');
const flat = require('flat');
const Event = require('../models/Event');
const GoogleDrive = require('../models/GoogleDrive');
const translate = require('../helpers/translate');
const { addFile } = require('../helpers/gdriveStorage');
const {
  populateEvents, populateEventSubscription, createRepetitions, updateRepetitions, deleteRepetition
} = require('../helpers/events');
const { ABSENCE, NEVER } = require('../helpers/constants');

const { language } = translate;

const list = async (req) => {
  try {
    const query = { ...req.query };
    if (req.query.startDate) query.startDate = { $gte: moment(req.query.startDate, 'YYYYMMDD hh:mm').toDate() };
    if (req.query.endStartDate) {
      query.startDate = { ...query.startDate, $lte: moment(req.query.endStartDate, 'YYYYMMDD hh:mm').toDate() };
      _.unset(query, 'endStartDate');
    }
    if (req.query.auxiliary) query.auxiliary = { $in: req.query.auxiliary };
    if (req.query.customer) query.customer = { $in: req.query.customer };

    const events = await Event.find(query)
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder company picture' })
      .populate({ path: 'customer', select: 'identity subscriptions contact' })
      .lean();
    if (events.length === 0) return Boom.notFound(translate[language].eventsNotFound);

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

const create = async (req) => {
  try {
    let event = new Event(req.payload);
    await event.save();
    event = await Event.findOne({ _id: event._id })
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder company' })
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
    const event = await Event
      .findOneAndUpdate(
        { _id: req.params._id },
        { $set: flat(req.payload) },
        { autopopulate: false, new: true }
      )
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder company picture' })
      .populate({ path: 'customer', select: 'identity subscriptions contact' })
      .lean();

    if (!event) return Boom.notFound(translate[language].eventNotFound);

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

    return {
      message: translate[language].eventDeleted,
      data: { event }
    };
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
};
