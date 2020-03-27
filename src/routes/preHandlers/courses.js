
const Boom = require('@hapi/boom');
const User = require('../../models/User');

exports.getCourseTrainee = async (req) => {
  try {
    const { company, local } = req.payload;
    const trainee = await User.findOne({ 'local.email': local.email }).lean();
    if (trainee && trainee.company.toHexString() !== company) {
      throw Boom.conflict();
    }

    return trainee;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
