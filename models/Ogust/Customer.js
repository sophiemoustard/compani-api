const Ogust = require('../../config/config').Ogust;
const rp = require('request-promise');

const { getIntervalInRange } = require('../../helpers/intervalInRange');

/*
** Get all customers
** PARAMS:
** - token: token after login
** - status: customer status
** - nature: customer nature
** Method: POST
*/

// const param = {
//   qs: {
//
//   },
//   body: {
//
//   }
// }
//
// const param2 = _pickBy(param);

exports.getCustomers = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}searchCustomer`,
    json: true,
    body: {
      token: params.token,
      status: params.status,
      nbperpage: params.nbperpage,
      pagenum: params.pagenum
    },
    resolveWithFullResponse: true,
    time: true,
  };
  const result = await rp.post(options);
  return result;
};

/*
** Get a customer by customer id
** PARAMS:
** - token: token after login
** - id: customer id
** - status: customer status
** Method: POST
*/
exports.getCustomerById = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}getCustomer`,
    json: true,
    body: {
      token: params.token,
      id_customer: params.id,
      status: params.status
    },
    resolveWithFullResponse: true,
    time: true,
  };
  const result = await rp.post(options);
  return result;
};

exports.getThirdPartyInformationByCustomerId = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}getThirdPartyInformations`,
    json: true,
    body: {
      token: params.token,
      nbperpage: params.nbperpage,
      pagenum: params.pagenum,
      third_party: params.third_party,
      third_party_id: params.id,
    },
    resolveWithFullResponse: true,
    time: true,
  };
  const res = await rp.post(options);
  return res;
};

exports.editThirdPartyInformationByCustomerId = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}setThirdPartyInformations`,
    json: true,
    body: {
      token: params.token,
      third_party_id: params.id,
      third_party: params.third_party,
      array_values: params.arrayValues
    },
    resolveWithFullResponse: true,
    time: true,
  };
  const res = await rp.post(options);
  return res;
};

/*
** Get services by customer id in range or by date
** PARAMS:
** - token: token after login
** - id: customer id
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
      id_customer: params.id,
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
