const Boom = require('boom');
const moment = require('moment');
const _ = require('lodash');
const flat = require('flat');
const Event = require('../models/Event');
const GoogleDrive = require('../models/Google/Drive');
const translate = require('../helpers/translate');
const { addFile } = require('../helpers/gdriveStorage');
const {
  populateEvents, populateEventSubscription, createRepetitions, updateRepetitions, deleteRepetition
} = require('../helpers/events');
const { ABSENCE, NEVER } = require('../helpers/constants');

const { language } = translate;

const list = async (req) => {
  try {
    let query = req.query.type ? { type: req.query.auxiliary } : {};
    if (req.query.auxiliary) query.auxiliary = { $in: req.query.auxiliary };
    if (req.query.customer) query.customer = { $in: req.query.customer };

    if (req.query.startDate && req.query.endDate) {
      const searchStartDate = moment(req.query.startDate, 'YYYYMMDD hh:mm').toDate();
      const searchEndDate = moment(req.query.endDate, 'YYYYMMDD hh:mm').toDate();
      query = {
        ...query,
        $or: [
          { startDate: { $lte: searchEndDate, $gte: searchStartDate } },
          { endDate: { $lte: searchEndDate, $gte: searchStartDate } },
          { endDate: { $gte: searchEndDate }, startDate: { $lte: searchStartDate } },
        ],
      };
    } else if (req.query.startDate && !req.query.endDate) {
      const searchStartDate = moment(req.query.startDate, 'YYYYMMDD hh:mm').toDate();
      query = {
        ...query,
        $or: [
          { startDate: { $gte: searchStartDate } },
          { endDate: { $gte: searchStartDate } },
        ],
      };
    } else if (req.query.endDate) {
      const searchEndDate = moment(req.query.endDate, 'YYYYMMDD hh:mm').toDate();
      query = {
        ...query,
        $or: [
          { startDate: { $lte: searchEndDate } },
          { endDate: { $lte: searchEndDate } },
        ],
      };
    }

    const events = await Event.find(query)
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder company picture' })
      .populate({ path: 'customer', select: 'identity subscriptions contact' })
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
