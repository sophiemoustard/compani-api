const moment = require('moment');
const get = require('lodash/get');
const Event = require('../models/Event');
const NumbersHelper = require('../helpers/numbers');
const {
  INTERNAL_HOUR,
  INTERVENTION,
  ABSENCE,
  INVOICED_AND_PAID,
  INVOICED_AND_NOT_PAID,
} = require('../helpers/constants');
const { CompaniDuration } = require('../helpers/dates/companiDurations');
const { CompaniDate } = require('../helpers/dates/companiDates');

exports.getAbsencesForExport = async (start, end, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = {
    type: ABSENCE,
    startDate: { $lt: end },
    endDate: { $gt: start },
    company: companyId,
  };

  return Event.find(query)
    .sort({ startDate: 'desc' })
    .populate({
      path: 'auxiliary',
      select: 'identity sector contracts',
      populate: [
        { path: 'sector', match: { company: companyId } },
        { path: 'contracts', match: { company: companyId } },
      ],
    })
    .populate({ path: 'extension', select: 'startDate' })
    .lean({ autopopulate: true });
};

exports.getTaxCertificateInterventions = async (taxCertificate, companyId) => {
  const startDate = moment(taxCertificate.year, 'YYYY').startOf('year').toDate();
  const endDate = moment(taxCertificate.year, 'YYYY').endOf('year').toDate();
  const { _id: customerId, subscriptions } = taxCertificate.customer;

  const events = await Event.aggregate([
    {
      $match: {
        customer: customerId,
        startDate: { $lt: endDate },
        endDate: { $gte: startDate },
        $or: [{ isCancelled: false }, { 'cancel.condition': { $in: [INVOICED_AND_PAID, INVOICED_AND_NOT_PAID] } }],
      },
    },
    {
      $group: {
        _id: { auxiliary: '$auxiliary', month: { $month: '$startDate' }, sub: '$subscription' },
        eventList: { $push: { startDate: '$startDate', endDate: '$endDate' } },
      },
    },
    { $lookup: { from: 'users', as: 'auxiliary', localField: '_id.auxiliary', foreignField: '_id' } },
    { $unwind: '$auxiliary' },
    {
      $addFields: {
        subscription: { $filter: { input: subscriptions, as: 'sub', cond: { $eq: ['$$sub._id', '$_id.sub'] } } },
      },
    },
    { $unwind: '$subscription' },
    {
      $project: {
        auxiliary: { _id: 1, identity: 1, createdAt: 1, serialNumber: 1 },
        month: '$_id.month',
        subscription: 1,
        eventList: 1,
      },
    },
    { $sort: { month: 1 } },
  ]).option({ company: companyId });

  const formattedEvents = events.map(ev => ({
    ...ev,
    duration: parseFloat(ev.eventList.reduce((acc, event) =>
      NumbersHelper.add(
        acc,
        CompaniDuration(CompaniDate(event.endDate).oldDiff(event.startDate, 'minutes')).asHours()
      ), NumbersHelper.toString(0))),
  }));

  return formattedEvents;
};

exports.getEventsByDayAndAuxiliary = async (startDate, endDate, companyId) => Event.aggregate([
  {
    $match: {
      startDate: { $gte: startDate },
      endDate: { $lte: endDate },
      auxiliary: { $exists: true },
      $or: [{ isCancelled: false }, { 'cancel.condition': { $in: [INVOICED_AND_PAID] } }],
      type: { $in: [INTERNAL_HOUR, INTERVENTION] },
    },
  },
  {
    $project: {
      auxiliary: 1,
      startDate: 1,
      endDate: 1,
      address: 1,
      transportMode: 1,
      hasFixedService: 1,
      company: 1,
    },
  },
  {
    $group: {
      _id: {
        auxiliary: '$auxiliary',
        month: { $month: '$startDate' },
        day: { $dayOfMonth: '$startDate' },
      },
      eventsByDay: { $push: '$$ROOT' },
    },
  },
  {
    $group: {
      _id: { auxiliary: '$_id.auxiliary' },
      auxiliary: { $first: '$_id.auxiliary' },
      eventsByDay: { $push: '$eventsByDay' },
    },
  },
  { $lookup: { from: 'users', as: 'auxiliary', localField: 'auxiliary', foreignField: '_id' } },
  { $unwind: { path: '$auxiliary' } },
  {
    $project: {
      auxiliary: { _id: 1, identity: { firstname: 1, lastname: 1 }, administrative: 1 },
      eventsByDay: 1,
    },
  },
]).option({ company: companyId });
