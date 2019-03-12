const Boom = require('boom');
const flat = require('flat');
const mongoose = require('mongoose');

const Contract = require('../models/Contract');
const User = require('../models/User');
const Customer = require('../models/Customer');
const translate = require('../helpers/translate');
const { endContract, createAndSaveFile } = require('../helpers/contracts');
const { generateSignatureRequest } = require('../helpers/generateSignatureRequest');

const { language } = translate;

const list = async (req) => {
  try {
    const contracts = await Contract
      .find(req.query)
      .populate({ path: 'user', select: 'identity' })
      .populate({ path: 'customer', select: 'identity' })
      .lean();

    const message = !contracts ? translate[language].contractsNotFound : translate[language].contractsFound;

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
      .populate({ path: 'user', select: 'identity' })
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
      ogustContractId: req.payload.ogustContractId,
    }];
    if (req.payload.signature) {
      const doc = await generateSignatureRequest(req.payload.signature);
      if (doc.data.error) return Boom.badRequest(`Eversign: ${doc.data.error.type}`);
      contract.version[0].eversignId = doc.data.document_hash;
      delete req.payload.signature;
    }
    await contract.save();

    await User.findOneAndUpdate({ _id: contract.user }, { $push: { contracts: contract._id } });
    if (contract.customer) await Customer.findOneAndUpdate({ _id: contract.customer }, { $push: { contracts: contract._id } });

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
      contract = await Contract
        .findByIdAndUpdate(req.params._id, req.paylaod)
        .populate({ path: 'user', select: 'identity' })
        .populate({ path: 'customer', select: 'identity' });
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

    await User.findOneAndUpdate({ _id: contract.user }, { $pull: { contracts: contract._id } });
    if (contract.customer) await Customer.findOneAndUpdate({ _id: contract.customer }, { $pull: { contracts: contract._id } });

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
    if (req.payload.signature) {
      const doc = await generateSignatureRequest(req.payload.signature);
      if (doc.data.error) return Boom.badRequest(`Eversign: ${doc.data.error.type}`);
      req.payload.eversignId = doc.data.document_hash;
      delete req.payload.signature;
    }
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
        arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(req.params.versionId) }],
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

const uploadFile = async (req) => {
  try {
    const allowedFields = [
      'signedContract',
      'signedVersion',
    ];
    const administrativeKeys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    if (administrativeKeys.length === 0) return Boom.forbidden(translate[language].uploadNotAllowed);
    if (!req.payload.contractId && !req.payload.versionId) {
      return Boom.badRequest();
    }

    const uploadedFile = await createAndSaveFile(administrativeKeys, req.params, req.payload);

    return { message: translate[language].fileCreated, data: { uploadedFile } };
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
  uploadFile,
};
