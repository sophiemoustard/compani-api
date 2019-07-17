const Boom = require('boom');
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
  updateEvent,
  deleteRepetition,
  isEditionAllowed,
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
        populate: { path: 'subscriptions.service' },
      })
      .lean();
    if (events.length === 0) {
      return {
        message: translate[language].eventsNotFound,
        data: { events: [] },
      };
    }

    const populatedEvents = await populateEvents(events);

    return {
      message: translate[language].eventsFound,
      data: { events: populatedEvents },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const listByAuxiliaries = async (req) => {
  try {
    const query = getListQuery(req);

    const events = await Event.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'auxiliary',
          foreignField: '_id',
          as: 'auxiliary',
        },
      },
      { $unwind: { path: '$auxiliary', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          subscription: {
            $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$subscription'] } },
          },
        },
      },
      { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'services',
          localField: 'subscription.service',
          foreignField: '_id',
          as: 'subscription.service',
        },
      },
      { $unwind: { path: '$subscription.service', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          customer: { _id: 1, identity: 1, contact: 1 },
          auxiliary: {
            _id: 1,
            identity: 1,
            administrative: { driveFolder: 1, transportInvoice: 1 },
            company: 1,
            picture: 1,
          },
          type: 1,
          startDate: 1,
          endDate: 1,
          sector: 1,
          subscription: 1,
          internalHour: 1,
          absence: 1,
          absenceNature: 1,
          location: 1,
          misc: 1,
          attachment: 1,
          repetition: 1,
          isCancelled: 1,
          cancel: 1,
          isBilled: 1,
          bills: 1,
          status: 1,
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$auxiliary._id', '$sector'] },
          events: { $push: '$$ROOT' },
        },
      },
    ]);

    if (events.length === 0) {
      return {
        message: translate[language].eventsNotFound,
        data: { events: [] },
      };
    }

    return {
      message: translate[language].eventsFound,
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
    const { payload } = req;

    if (payload.type !== ABSENCE && !moment(payload.startDate).isSame(payload.endDate, 'day')) {
      throw Boom.badRequest(translate[language].eventDatesNotOnSameDay);
    }

    if (!(await isCreationAllowed(payload))) return Boom.badData();

    let event = new Event(payload);
    await event.save();
    event = await Event.findOne({ _id: event._id })
      .populate({ path: 'auxiliary', select: 'identity administrative.driveFolder administrative.transportInvoice company' })
      .populate({ path: 'customer', select: 'identity subscriptions contact' })
      .lean();

    if (event.type !== ABSENCE && payload.repetition && payload.repetition.frequency !== NEVER) {
      event = await createRepetitions(event);
    }

    const populatedEvent = await populateEventSubscription(event);

    return {
      message: translate[language].eventCreated,
      data: { event: populatedEvent },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const { payload } = req;

    let event = await Event.findOne({ _id: req.params._id }).lean();
    if (!event) return Boom.notFound(translate[language].eventNotFound);

    if (event.type !== ABSENCE && !moment(payload.startDate).isSame(payload.endDate, 'day')) {
      throw Boom.badRequest(translate[language].eventDatesNotOnSameDay);
    }

    if (!(await isEditionAllowed(event, payload))) return Boom.badData();

    event = await updateEvent(event, payload);

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
    const event = await Event.findByIdAndRemove({ _id: req.params._id });
    if (!event) return Boom.notFound(translate[language].eventNotFound);

    return { message: translate[language].eventDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
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
  listByAuxiliaries,
};
