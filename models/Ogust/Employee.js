const { Ogust } = require('../../config/config');
const axios = require('axios');

const { getIntervalInRange } = require('../../helpers/utils');

// Get all employees
exports.getEmployees = async payload => axios.post(`${Ogust.API_LINK}searchEmployee`, payload);

// Get an employee by employee id
exports.getEmployeeById = async payload => axios.post(`${Ogust.API_LINK}getEmployee`, payload);

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
  if (params.isRange) {
    interval = getIntervalInRange(params.slotToSub, params.slotToAdd, params.intervalType);
  }
  if (params.isDate) {
    interval.intervalBwd = parseInt(params.startDate, 10);
    interval.intervalFwd = parseInt(params.endDate, 10);
  }
  const newParams = {
    token: params.token,
    id_employee: params.id_employee,
    id_customer: params.idCustomer,
    status: params.status,
    type: params.type, // I = Intervention
    start_date: `${'@between|'}${interval.intervalBwd}|${interval.intervalFwd}`,
    nbperpage: params.nbperpage,
    pagenum: params.pagenum
  };
  return axios.post(`${Ogust.API_LINK}searchService`, newParams);
};

// Get salaries by employee id
exports.getSalaries = async payload => axios.post(`${Ogust.API_LINK}searchSalary`, payload);

// Create employee
exports.createEmployee = async payload => axios.post(`${Ogust.API_LINK}setEmployee`, payload);

// Delete employee
exports.deleteEmployee = async payload => axios.post(`${Ogust.API_LINK}remEmployee`, payload);
