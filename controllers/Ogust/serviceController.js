const translate = require('../../helpers/translate');
const services = require('../../models/Ogust/Service');
const _ = require('lodash');

const language = translate.language;

const getAll = async (req, res) => {
  try {
    let servicesRaw = {};
    if ((req.query.isRange == 'true' && req.query.slotToSub && req.query.slotToAdd && req.query.intervalType)
    || (req.query.isDate == 'true' && req.query.startDate && req.query.endDate)) {
      const params = {
        token: req.headers['x-ogust-token'],
        isRange: req.query.isRange || false,
        isDate: req.query.isDate || false,
        slotToSub: req.query.slotToSub || '',
        slotToAdd: req.query.slotToAdd || '',
        intervalType: req.query.intervalType || '',
        startDate: req.query.startDate || '',
        endDate: req.query.endDate || '',
        status: req.query.status || '@!=|N',
        type: req.query.type || 'I',
        nbperpage: req.query.nbPerPage || '100',
        pagenum: req.query.pageNum || '1'
      };
      const newParams = _.pickBy(params);
      servicesRaw = await services.getServices(newParams);
    } else {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    if (servicesRaw.body.status == 'KO') {
      res.status(400).json({ success: false, message: servicesRaw.body.message });
    } else if (servicesRaw.length === 0) {
      res.status(404).json({ success: false, message: translate[language].servicesNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].servicesFound, data: { servicesRaw: servicesRaw.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getById = async (req, res) => {
  try {
    let servicesRaw = {};
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      id: req.params.id,
      status: req.query.status || '@!=|N',
      type: req.query.type || 'I'
    };
    const newParams = _.pickBy(params);
    servicesRaw = await services.getServiceById(newParams);
    if (servicesRaw.body.status == 'KO') {
      res.status(400).json({ success: false, message: servicesRaw.body.message });
    } else if (servicesRaw.length === 0) {
      res.status(404).json({ success: false, message: translate[language].serviceNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].serviceFound, data: { servicesRaw: servicesRaw.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  getAll,
  getById
};
