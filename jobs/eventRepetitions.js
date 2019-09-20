const moment = require('moment');
const pick = require('lodash/pick');
const Repetition = require('../models/Repetition');
const Event = require('../models/Event');
const { EVERY_WEEK, EVERY_DAY, EVERY_WEEK_DAY, EVERY_TWO_WEEKS } = require('../helpers/constants');
const EventsValidationHelper = require('../helpers/eventsValidation');
const EmailHelper = require('../helpers/email');

const createFutureEventBasedOnRepetition = async (repetition) => {
  const { frequency, parentId, startDate, endDate } = repetition;
  const startDateObj = moment(startDate).toObject();
  const endDateObj = moment(endDate).toObject();
  const newEventStartDate = moment().add(90, 'd').set(pick(startDateObj, ['hours', 'minutes', 'seconds', 'milliseconds'])).toDate();
  const newEventEndDate = moment().add(90, 'd').set(pick(endDateObj, ['hours', 'minutes', 'seconds', 'milliseconds'])).toDate();
  const newEventPayload = {
    ...pick(repetition, ['type', 'customer', 'subscription', 'auxiliary', 'sector', 'status']),
    startDate: newEventStartDate,
    endDate: newEventEndDate,
    repetition: { frequency, parentId },
  };

  if (await EventsValidationHelper.hasConflicts(newEventPayload)) {
    delete newEventPayload.auxiliary;
    delete newEventPayload.repetition;
  }

  return new Event(newEventPayload);
};

const eventRepetitions = {
  async method(server) {
    const errors = [];
    const newEvents = [];
    const repetitions = await Repetition.find({ startDate: { $lt: moment().startOf('d') } }).lean();
    if (!repetitions.length) return server.log(['cron', 'jobs'], 'Event repetitions: No repetitions found.');
    for (const repetition of repetitions) {
      const { startDate, frequency } = repetition;
      try {
        const futureEvent = await createFutureEventBasedOnRepetition(repetition);
        const { newEventStartDate } = futureEvent;
        if (frequency === EVERY_TWO_WEEKS && moment(startDate).day() === moment(newEventStartDate).day() && (moment(newEventStartDate).diff(moment(startDate), 'week') % 2 === 0)) {
          newEvents.push(futureEvent);
        } else if (frequency === EVERY_WEEK && moment(startDate).day() === moment(newEventStartDate).day()) {
          newEvents.push(futureEvent);
        } else if (frequency === EVERY_DAY) {
          newEvents.push(futureEvent);
        } else if (frequency === EVERY_WEEK_DAY && moment(newEventStartDate).day() !== 0 && moment(newEventStartDate).day() !== 6) {
          newEvents.push(futureEvent);
        }
      } catch (e) {
        server.log(['error', 'cron', 'jobs'], e);
        errors.push(repetition._id);
      }
    }
    const newSavedEvents = await Event.insertMany(newEvents);
    this.onComplete(server, newSavedEvents, errors);
  },
  async onComplete(server, results, errors) {
    try {
      server.log(['cron'], 'Event repetitions OK');
      if (errors && errors.length) {
        server.log(['error', 'cron', 'oncomplete'], errors);
      }
      server.log(['cron', 'oncomplete'], `Event repetitions: ${results.length} répétitions traitées.`);
      EmailHelper.completeEventRepScriptEmail(results.length, errors);
    } catch (e) {
      server.log(['error', 'cron', 'oncomplete'], e);
    }
  },
};

module.exports = eventRepetitions;
