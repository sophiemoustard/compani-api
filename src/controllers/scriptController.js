const Boom = require('@hapi/boom');
const eventRepetitions = require('../jobs/eventRepetitions');
const updateRole = require('../jobs/updateRole');
const eventConsistency = require('../jobs/eventConsistency');

const eventRepetitionsScript = async (req) => {
  try {
    const job = await eventRepetitions.method(req);

    return { message: `Event repetitions: ${job ? job.results.length : 0} évènements créés.`, data: job };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateRoleScript = async (req) => {
  try {
    const job = await updateRole.method(req);

    return { message: `Update role: ${job.results}.`, data: job };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const eventConsistencyScript = async (req) => {
  try {
    const job = await eventConsistency.method(req);

    return { message: `event consistency: ${job.results}.`, data: job };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { eventRepetitionsScript, updateRoleScript, eventConsistencyScript };
