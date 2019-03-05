const Boom = require('boom');
const flat = require('flat');
const mongoose = require('mongoose');

const Contract = require('../models/Contract');
const translate = require('../helpers/translate');
const { endContract } = require('../helpers/userContracts');

const { language } = translate;

const list = async (req) => {
  try {
    const contracts = await Contract
      .find(req.query)
      .populate({ path: 'auxiliary', select: 'identity' })
      .populate({ path: 'customer', select: 'identity' })
      .lean();
    const message = !contracts ? translate[language].contractsFound : translate[language].contractsNotFound;

    return { message, data: { contracts } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const get = async (req) => {
  try {
    const contract = await Contract
      .findOne({ _id: req.params._id })
      .populate({ path: 'auxiliary', select: 'identity' })
      .populate({ path: 'customer', select: 'identity' })
      .lean();
    if (!contract) return Boom.notFound();

    return { message: translate[language].contractFound, data: { contract } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const contract = new Contract(req.payload);
    contract.version = [{
      startDate: req.payload.startDate,
      weeklyHours: req.payload.weeklyHours,
      grossHourlyRate: req.payload.grossHourlyRate,
      ogustContractId: req.payload.ogustContractId
    }];
    await contract.save();

    return {
      message: translate[language].contractCreated,
      data: { contract },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    let contract;
    if (req.payload.endDate) {
      contract = await endContract(req.params._id, req.payload);
    } else {
      contract = await Contract.findByIdAndUpdate(req.params._id, req.paylaod);
    }

    if (!contract) return Boom.notFound(translate[language].contractNotFound);

    return {
      message: translate[language].contractUpdated,
      data: { contract },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const contract = await Contract.findByIdAndRemove({ _id: req.params._id });
    if (!contract) return Boom.notFound(translate[language].contractNotFound);

    return {
      message: translate[language].contractDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const createContractVersion = async (req) => {
  try {
    const contract = await Contract.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { versions: req.payload } },
      { new: true, autopopulate: false }
    );

    return { message: translate[language].contractVersionAdded, data: { contract } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateContractVersion = async (req) => {
  try {
    const payload = { 'versions.$[version]': { ...req.payload } };
    const contract = await Contract.findOneAndUpdate(
      { _id: req.params._id, },
      { $set: flat(payload) },
      {
        // Conversion to objectIds is mandatory as we use directly mongo arrayFilters
        arrayFilters: [
          { 'version._id': mongoose.Types.ObjectId(req.params.versionId) }
        ],
        new: true,
        autopopulate: false,
      }
    );

    return {
      message: translate[language].contractVersionUpdated,
      data: { contract }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeContractVersion = async (req) => {
  try {
    await Contract.findOneAndUpdate(
      { _id: req.params._id, 'versions._id': req.params.contractId },
      { $pull: { versions: { _id: req.params.versionId } } },
      { autopopulate: false },
    );

    return {
      message: translate[language].contractVersionRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  createContractVersion,
  updateContractVersion,
  removeContractVersion,
};
