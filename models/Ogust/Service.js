const Ogust = require('../../config/config').Ogust;
const rp = require('request-promise');

const { getIntervalInRange } = require('../../helpers/intervalInRange');

// =========================================================
// SERVICES
// =========================================================

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
** Get a service by id
** PARAMS:
** - token: token after login
** - id_service: service id
** - status: '@!=|N', 'R'...
** - type: 'I'...
** METHOD: POST
*/
exports.getServiceById = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}getService`,
    json: true,
    body: {
      token: params.token,
      id_service: params.id,
      status: params.status,
      type: params.type // I = Intervention
    },
    resolveWithFullResponse: true,
    time: true
  };
  const res = await rp.post(options);
  return res;
};
