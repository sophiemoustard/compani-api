const moment = require('moment');
const Repetition = require('../models/Repetition');
const Event = require('../models/Event');
const { EVERY_WEEK, EVERY_DAY, EVERY_WEEK_DAY, EVERY_TWO_WEEKS } = require('../helpers/constants');
const EventsRepetitionHelper = require('../helpers/eventsRepetition');
const EmailHelper = require('../helpers/email');

const eventRepetitions = {
  async method(server) {
    const errors = [];
    const newEvents = [];
    const repetitions = await Repetition.find({ startDate: { $lt: moment().startOf('d').toDate() } }).lean();
    if (!repetitions.length) return server.log(['cron', 'jobs'], 'Event repetitions: No repetitions found.');
    for (const repetition of repetitions) {
      const { startDate, frequency } = repetition;
      try {
        const futureEvent = await EventsRepetitionHelper.createFutureEventBasedOnRepetition(repetition);
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
