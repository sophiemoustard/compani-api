const Boom = require('@hapi/boom');
const get = require('lodash/get');
const AttendanceHelper = require('../helpers/attendances');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const { courseSlotsIds, company } = req.pre.attendancesInfos;
    const attendances = await AttendanceHelper.list(courseSlotsIds, company);

    return {
      message: attendances.length ? translate[language].attendancesFound : translate[language].attendancesNotFound,
      data: { attendances },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listUnsubscribed = async (req) => {
  try {
    const { query, auth } = req;
    const unsubscribedAttendances = await AttendanceHelper
      .listUnsubscribed(query.course, get(auth, 'credentials.company._id'));

    return {
      message: unsubscribedAttendances.length
        ? translate[language].attendancesFound
        : translate[language].attendancesNotFound,
      data: { unsubscribedAttendances },
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

module.exports = { list, listUnsubscribed, create, remove };
