const Boom = require('@hapi/boom');
const updateRole = require('../jobs/updateRole');

const updateRoleScript = async (req) => {
  try {
    const job = await updateRole.method(req);

    return { message: `Update role: ${job.results}.`, data: job };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { updateRoleScript };
