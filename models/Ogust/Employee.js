const Ogust = require('../../config/config').Ogust;
const rp = require('request-promise');

const { getIntervalInRange } = require('../../helpers/intervalInRange');

/*
** Get all employees
** PARAMS:
** - token: token after login
** - status: employee status (active...)
** - nature: employee nature (employee, customer...)
** Method: POST
*/
exports.getEmployees = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}searchEmployee`,
    json: true,
    body: params,
    resolveWithFullResponse: true,
    time: true,
  };
  const result = await rp.post(options);
  return result;
};

/*
** Get all employees by sector
** PARAMS:
** - token: token after login
** - sector: employee sector
** - nbpepage: X (number of results returned per pages)
** - pagenum: Y (number of pages)
** METHOD: POST
*/
exports.getEmployeesBySector = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}searchEmployee`,
    json: true,
    body: params,
    resolveWithFullResponse: true,
    time: true,
  };
  const result = await rp.post(options);
  return result;
};

/*
** Get an employee by employee id
** PARAMS:
** - token: token after login
** - id: employee id
** - status: employee status
** Method: POST
*/
exports.getEmployeeById = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}getEmployee`,
    json: true,
    body: params,
    resolveWithFullResponse: true,
    time: true,
  };
  const result = await rp.post(options);
  return result;
};

/*
** Get services by employee id in range or by date
** PARAMS:
** - token: token after login
** - id: employee id
** - isRange: true / false
** - isDate: true / false
** - slotToSub (time in number to subtract),
** - slotToAdd (time in number to add)
** - intervalType: "day", "week", "year", "hour"...
** - dateStart: YYYYMMDDHHmm format
** - dateEnd: YYYYMMDDHHmm format
** - status: '@!=|N', 'R'...
** - type: 'I'...
** - nbPerPage: X (number of results returned per pages)
** - pageNum: Y (number of pages)
** METHOD: POST
*/
exports.getServices = async (params) => {
  let interval = {};
  if (params.isRange == 'true') {
    interval = getIntervalInRange(params.slotToSub, params.slotToAdd, params.intervalType);
  }
  if (params.isDate == 'true') {
    interval.intervalBwd = parseInt(params.startDate, 10);
    interval.intervalFwd = parseInt(params.endDate, 10);
  }
  const options = {
    url: `${Ogust.API_LINK}searchService`,
    json: true,
    body: {
      token: params.token,
      id_employee: params.id_employee,
      status: params.status,
      type: params.type, // I = Intervention
      start_date: `${'@between|'}${interval.intervalBwd}|${interval.intervalFwd}`,
      nbperpage: params.nbperpage,
      pagenum: params.pagenum
    },
    resolveWithFullResponse: true,
    time: true
  };
  const res = await rp.post(options);
  return res;
};

/*
** Get salaries by employee id
** PARAMS:
** - token: token after login
** - id: employee id
** - nbPerPage: X (number of results returned per pages)
** - pageNum: Y (number of pages)
** METHOD: POST
*/
exports.getSalaries = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}searchSalary`,
    json: true,
    body: params,
    resolveWithFullResponse: true,
    time: true,
  };
  const res = await rp.post(options);
  return res;
};

exports.createEmployee = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}setEmployee`,
    json: true,
    body: params,
    resolveWithFullResponse: true,
    time: true
  };
  const res = await rp.post(options);
  return res;
};