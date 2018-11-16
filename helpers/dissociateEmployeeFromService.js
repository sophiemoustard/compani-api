const Boom = require('boom');
const moment = require('moment');

const { getServices, setServiceById } = require('../models/Ogust/Service');
const { getToken } = require('../models/Ogust/Token');

exports.dissociateEmployeeFromService = async (params = {}) => {
  const tokenRaw = await getToken();
  if (tokenRaw.data.status == 'KO') {
    throw Boom.badRequest(tokenRaw.data.message);
  }
  const payload = {
    id_employee: '365979065',
    isDate: true,
    status: 'A',
    startDate: moment(params.from).format('YYYYMMDDHHmm'),
    endDate: `${moment(params.from).add(2, 'months').format('YYYYMMDD')}2359`,
    token: tokenRaw.data.token
  };
  const servicesRaw = await getServices(payload);
  if (servicesRaw.data.status == 'KO') {
    throw Boom.badRequest(servicesRaw.data.message);
  } else if (Object.keys(servicesRaw.data.array_service.result).length === 0) {
    return;
  }
  const services = servicesRaw.data.array_service.result;
  const servicesPromises = [];
  for (const k in services) {
    servicesPromises.push(setServiceById({
      id_service: services[k].id_service,
      status: 'B',
      id_employee: 0,
      token: tokenRaw.data.token
    }));
  }
  return Promise.all(servicesPromises);
};
