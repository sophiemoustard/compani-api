const moment = require('moment');
const pick = require('lodash/pick');
const get = require('lodash/get');
const Repetition = require('../models/Repetition');
const Company = require('../models/Company');
const Event = require('../models/Event');
const {
  EVERY_WEEK,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_TWO_WEEKS,
  INTERNAL_HOUR,
  UNAVAILABILITY,
  INTERVENTION,
} = require('../helpers/constants');
const EventsRepetitionHelper = require('../helpers/eventsRepetition');
const CustomerAbsencesHelper = require('../helpers/customerAbsences');
const EmailHelper = require('../helpers/email');
const DatesHelper = require('../helpers/dates');

const createEventBasedOnRepetition = async (repetition, date, newEventStartDate) => {
  const { startDate, frequency } = repetition;
  let futureEvent;
  switch (frequency) {
    case EVERY_TWO_WEEKS:
      if (moment(startDate).day() === moment(newEventStartDate).day() &&
        (newEventStartDate.diff(moment(startDate), 'week') % 2 === 0)) {
        futureEvent = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, date);
      }
      break;
    case EVERY_WEEK:
      if (moment(startDate).day() === newEventStartDate.day()) {
        futureEvent = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, date);
      }
      break;
    case EVERY_DAY:
      futureEvent = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, date);
      break;
    case EVERY_WEEK_DAY:
      if (newEventStartDate.day() !== 0 && newEventStartDate.day() !== 6) {
        futureEvent = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, date);
      }
      break;
  }

  if (!futureEvent) return null;
  return Event.create(futureEvent);
};

const eventRepetitions = {
  async method(server) {
    const date = get(server, 'query.date') || new Date();
    const type = get(server, 'query.type') || '';
    const errors = [];
    const companies = await Company.find({ 'subscriptions.erp': true }).lean();
    const newSavedEvents = [];
    const deletedRepetitions = [];

    for (const company of companies) {
      const companyEvents = [];
      const repetitions = await Repetition
        .find({ company: company._id, startDate: { $lt: moment(date).startOf('d').toDate() } })
        .populate({ path: 'customer', select: 'stoppedAt' })
        .lean();
      if (!repetitions.length) {
        server.log(['cron', 'jobs'], `Event repetitions: No repetitions found for company ${company._id}.`);
        continue;
      }

      const orderedRepetitions = type
        ? repetitions.filter(rep => rep.type === type)
        : [ // order matters
          ...repetitions.filter(rep => rep.type === INTERNAL_HOUR),
          ...repetitions.filter(rep => rep.type === UNAVAILABILITY),
          ...repetitions.filter(rep => rep.type === INTERVENTION),
        ];
      for (const repetition of orderedRepetitions) {
        const isIntervention = repetition.type === INTERVENTION;
        const newEventStartDate = moment(date).add(90, 'd')
          .set(pick(moment(repetition.startDate).toObject(), ['hours', 'minutes', 'seconds', 'milliseconds']));
        const stoppedAt = get(repetition, 'customer.stoppedAt');
        const isCustomerStopped = isIntervention && DatesHelper.isAfter(newEventStartDate, stoppedAt);

        if (isIntervention) {
          const isCustomerAbsent = await CustomerAbsencesHelper.isAbsent(repetition.customer, newEventStartDate);
          if (isCustomerAbsent) continue;
        }

        try {
          if (isCustomerStopped) {
            await Repetition.deleteOne({ _id: repetition._id });
            deletedRepetitions.push(repetition);
          } else {
            const futureEvent = await createEventBasedOnRepetition(repetition, date, newEventStartDate);
            if (futureEvent) companyEvents.push(futureEvent);
          }
        } catch (e) {
          server.log(['error', 'cron', 'jobs'], e);
          errors.push(repetition._id);
        }
      }
      server.log(
        ['cron', 'jobs'],
        `Event repetitions: ${companyEvents.length} events created for company ${company._id}.`
      );
      newSavedEvents.push(...companyEvents);
    }

    return { results: newSavedEvents, errors, deletedRepetitions };
  },
  async onComplete(server, { results, errors, deletedRepetitions }) {
    try {
      server.log(['cron'], 'Event repetitions OK');
      if (errors && errors.length) {
        server.log(['error', 'cron', 'oncomplete'], errors);
      }
      server.log(['cron', 'oncomplete'], `Event repetitions: ${results.length} évènements créés.`);
      EmailHelper.completeEventRepScriptEmail(results.length, deletedRepetitions, errors);
    } catch (e) {
      server.log(['error', 'cron', 'oncomplete'], e);
    }
  },
};

module.exports = eventRepetitions;
