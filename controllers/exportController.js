const Boom = require('boom');
const { SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION } = require('../helpers/constants');
const { exportServices } = require('../helpers/services');
const { exportToCsv } = require('../helpers/file');

const exportData = async (req, h) => {
  try {
    const type = SERVICE;

    let data;
    switch (type) {
      case AUXILIARY:
      case HELPER:
      case FUNDING:
      case CUSTOMER:
      case SUBSCRIPTION:
      case SERVICE:
        data = await exportServices();
    }

    const csv = await exportToCsv(data);

    return h.file(csv, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  exportData,
};
