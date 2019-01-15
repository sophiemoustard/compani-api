const Boom = require('boom');
const moment = require('moment');
const flat = require('flat');
const Event = require('../models/Event');
const GoogleDrive = require('../models/GoogleDrive');
const translate = require('../helpers/translate');
const { addFile } = require('../helpers/gdriveStorage');
const { populateEvents, populateEvent } = require('../helpers/events');

const { language } = translate;

const list = async (req) => {
  try {
    const query = { ...req.query };
    if (req.query.startDate) query.startDate = { $gte: moment(req.query.startDate, 'YYYYMMDD').toDate() };
    if (req.query.endDate) query.endDate = { $lte: moment(req.query.endDate, 'YYYYMMDD').toDate() };

    const events = await Event.find(query)
      .populate({ path: 'auxiliary', select: 'firstname lastname administrative.driveFolder company' })
      .populate({ path: 'customer', select: 'identity subscriptions' })
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
      .populate({ path: 'auxiliary', select: 'firstname lastname administrative.driveFolder company' })
      .populate({ path: 'customer', select: 'identity subscriptions' })
      .lean();

    const populatedEvent = await populateEvent(event);

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
      .populate({ path: 'auxiliary', select: 'firstname lastname administrative.driveFolder company' })
      .populate({ path: 'customer', select: 'identity subscriptions' })
      .lean();

    if (!event) return Boom.notFound(translate[language].eventNotFound);

    const populatedEvent = await populateEvent(event);

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
};
