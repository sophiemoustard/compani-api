const Ogust = require('../../config/config').Ogust;
const axios = require('axios');

const { getIntervalInRange } = require('../../helpers/intervalInRange');

/*
** Get all services in range or by date
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
  const newParams = {
    token: params.token,
    status: params.status,
    type: params.type,
    start_date: `${'@between|'}${interval.intervalBwd}|${interval.intervalFwd}`,
    nbperpage: params.nbperpage,
    pagenum: params.pagenum
  };
  return axios.post(`${Ogust.API_LINK}searchService`, newParams);
};

// Get a service by id
exports.getServiceById = async payload => axios.post(`${Ogust.API_LINK}searchService`, payload);

// Update a service by id
exports.setServiceById = async payload => axios.post(`${Ogust.API_LINK}setService`, payload);
