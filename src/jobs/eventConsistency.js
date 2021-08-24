const moment = require('moment');
const get = require('lodash/get');
const Company = require('../models/Company');
const User = require('../models/User');
const { INTERVENTION } = require('../helpers/constants');
const EmailHelper = require('../helpers/email');
const ContractHelper = require('../helpers/contracts');
const EventRepository = require('../repositories/EventRepository');
const EventsValidationHelper = require('../helpers/eventsValidation');

const getIssuesWithEvent = async (event, auxiliary, companyId) => {
  const issuesWithEvent = [];

  const eventStartDate = event.startDate;
  if (auxiliary) {
    if (!ContractHelper.auxiliaryHasActiveContractOnDay(auxiliary.contracts, eventStartDate)) {
      issuesWithEvent.push('l\'auxiliaire n\'a pas de contrat le jour de l\'évènement');
    }

    const eventHasConflict = await EventsValidationHelper.hasConflicts({ ...event, company: companyId });
    if (eventHasConflict && !event.isCancelled) {
      issuesWithEvent.push('l\'évènement est en conflit');
    }
  }

  if (event.type === INTERVENTION) {
    if (!event.customer || !get(event, 'subscription._id')) {
      issuesWithEvent.push('Il y a un soucis dans la souscription ou le/la bénéficiaire de l\'intervention');
    }
  }

  return issuesWithEvent;
};

const eventConsistency = {
  async method() {
    let error;
    const eventsWithErrors = [];
    try {
      const companies = await Company.find({}).lean();
      for (const company of companies) {
        const query = { updatedAt: { $gte: moment().subtract(1, 'w').startOf('day').toDate() } };
        const eventsByAuxiliary = await EventRepository.getEventsToCheckEventConsistency(query, company._id);

        for (const auxiliaryWithEvents of eventsByAuxiliary) {
          const auxiliary = await User.findOne({ _id: auxiliaryWithEvents._id }).populate('contracts').lean();

          for (const event of auxiliaryWithEvents.events) {
            const issuesWithEvent = await getIssuesWithEvent(event, auxiliary, company._id);
            if (issuesWithEvent.length) {
              eventsWithErrors.push({
                eventId: event._id,
                issuesWithEvent: issuesWithEvent.join(', '),
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      error = e.message;
    }
    return { eventsWithErrors, error };
  },

  async onComplete(server, { eventsWithErrors, error }) {
    try {
      server.log(['cron'], 'bdd consistency OK');
      if (error) server.log(['error', 'cron', 'oncomplete'], error);
      server.log(['cron', 'oncomplete'], `${eventsWithErrors.length} events with errors.`);
      EmailHelper.completeEventConsistencyScriptEmail(eventsWithErrors);
    } catch (e) {
      server.log(['error', 'cron', 'oncomplete'], e);
    }
  },
};

module.exports = eventConsistency;
