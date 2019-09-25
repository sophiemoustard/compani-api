const moment = require('moment');
const pick = require('lodash/pick');
const Repetition = require('../models/Repetition');
const Event = require('../models/Event');
const { EVERY_WEEK, EVERY_DAY, EVERY_WEEK_DAY, EVERY_TWO_WEEKS } = require('../helpers/constants');
const EventsRepetitionHelper = require('../helpers/eventsRepetition');
const EmailHelper = require('../helpers/email');

const eventRepetitions = {
  async method(server) {
    const errors = [];
    const newEvents = [];
    const repetitions = await Repetition.find({ startDate: { $lt: moment(new Date()).startOf('d').toDate() } }).lean();
    if (!repetitions.length) return server.log(['cron', 'jobs'], 'Event repetitions: No repetitions found.');

    for (const repetition of repetitions) {
      const { startDate, frequency } = repetition;
      const newEventStartDate = moment(new Date()).add(90, 'd').set(pick(moment(startDate).toObject(), ['hours', 'minutes', 'seconds', 'milliseconds']));
      let futureEvent;
      try {
        switch (frequency) {
          case EVERY_TWO_WEEKS:
            if (moment(startDate).day() === moment(newEventStartDate).day() && (newEventStartDate.diff(moment(startDate), 'week') % 2 === 0)) {
              futureEvent = await EventsRepetitionHelper.createFutureEventBasedOnRepetition(repetition);
              newEvents.push(futureEvent);
            }
            break;
          case EVERY_WEEK:
            if (moment(startDate).day() === newEventStartDate.day()) {
              futureEvent = await EventsRepetitionHelper.createFutureEventBasedOnRepetition(repetition);
              newEvents.push(futureEvent);
            }
            break;
          case EVERY_DAY:
            futureEvent = await EventsRepetitionHelper.createFutureEventBasedOnRepetition(repetition);
            newEvents.push(futureEvent);
            break;
          case EVERY_WEEK_DAY:
            if (newEventStartDate.day() !== 0 && newEventStartDate.day() !== 6) {
              futureEvent = await EventsRepetitionHelper.createFutureEventBasedOnRepetition(repetition);
              newEvents.push(futureEvent);
            }
            break;
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
      server.log(['cron', 'oncomplete'], `Event repetitions: ${results.length} évènements créés.`);
      EmailHelper.completeEventRepScriptEmail(results.length, errors);
    } catch (e) {
      server.log(['error', 'cron', 'oncomplete'], e);
    }
  },
};

module.exports = eventRepetitions;
