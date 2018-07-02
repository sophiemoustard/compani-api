const Ogust = require('../../config/config').Ogust;
const axios = require('axios');

const { getIntervalInRange } = require('../../helpers/intervalInRange');

// Get customers
exports.getCustomers = async params => axios.post(`${Ogust.API_LINK}searchCustomer`, params);

// Get a customer by customer id
exports.getCustomerById = async params => axios.post(`${Ogust.API_LINK}getCustomer`, params);

// Edit customer by id
exports.editCustomerById = async params => axios.post(`${Ogust.API_LINK}setCustomer`, params);

// Get third party information by customer id
exports.getThirdPartyInformationByCustomerId = async params => axios.post(`${Ogust.API_LINK}getThirdPartyInformations`, params);

// Edit third party information by customer id
exports.editThirdPartyInformationByCustomerId = async params => axios.post(`${Ogust.API_LINK}setThirdPartyInformations`, params);

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
  const newParams = {
    token: params.token,
    id_customer: params.id_customer,
    status: params.status,
    type: params.type, // I = Intervention
    start_date: `${'@between|'}${interval.intervalBwd}|${interval.intervalFwd}`,
    nbperpage: params.nbperpage,
    pagenum: params.pagenum
  };
  return axios.post(`${Ogust.API_LINK}searchService`, newParams);
};

// Get fiscal attests
exports.getFiscalAttests = async params => axios.post(`${Ogust.API_LINK}searchFiscalattest`, params);

// Get invoices
exports.getInvoices = async params => axios.post(`${Ogust.API_LINK}searchInvoice`, params);

// Get contacts
exports.getContacts = async params => axios.post(`${Ogust.API_LINK}searchContact`, params);
