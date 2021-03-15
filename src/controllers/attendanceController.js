const Boom = require('@hapi/boom');
const AttendanceHelper = require('../helpers/attendances');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const attendances = await AttendanceHelper.list(req.pre.courseSlotsIds);

    return {
      message: attendances.length ? translate[language].attendancesFound : translate[language].attendancesNotFound,
      data: { attendances },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    await AttendanceHelper.create(req.payload);

    return { message: translate[language].attendanceCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await AttendanceHelper.delete(req.params._id);

    return { message: translate[language].attendanceDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  remove,
};
