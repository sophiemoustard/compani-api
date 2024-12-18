const Boom = require('@hapi/boom');
const AttendanceSheetHelper = require('../helpers/attendanceSheets');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const attendanceSheets = await AttendanceSheetHelper.list(req.query, req.auth.credentials);

    return {
      message: attendanceSheets.length
        ? translate[language].attendanceSheetsFound
        : translate[language].attendanceSheetsNotFound,
      data: { attendanceSheets },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    await AttendanceSheetHelper.create(req.payload);

    return { message: translate[language].attendanceSheetCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateAttendanceSheet = async (req) => {
  try {
    await AttendanceSheetHelper.update(req.params._id, req.payload);

    return { message: translate[language].attendanceSheetUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const deleteAttendanceSheet = async (req) => {
  try {
    await AttendanceSheetHelper.delete(req.params._id);

    return { message: translate[language].attendanceSheetDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, create, updateAttendanceSheet, deleteAttendanceSheet };
