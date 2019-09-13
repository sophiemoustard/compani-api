const Boom = require('boom');
const flat = require('flat');
const mongoose = require('mongoose');
const crypto = require('crypto');

const Contract = require('../models/Contract');
const User = require('../models/User');
const Customer = require('../models/Customer');
const ESign = require('../models/ESign');
const translate = require('../helpers/translate');
const { updateContract, createAndSaveFile, saveCompletedContract } = require('../helpers/contracts');
const { generateSignatureRequest } = require('../helpers/generateSignatureRequest');

const { language } = translate;

const list = async (req) => {
  try {
    const contracts = await Contract
      .find(req.query)
      .populate({ path: 'user', select: 'identity administrative.driveFolder' })
      .populate({ path: 'customer', select: 'identity driveFolder' })
      .lean();

    const message = !contracts ? translate[language].contractsNotFound : translate[language].contractsFound;

    return { message, data: { contracts } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
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
    if (!req.auth.credentials.scope.includes('contracts:read:user')) {
      const authUserId = req.auth.credentials._id;
      // 404 and not 403, the client shouldn't know the contract exists
      if (authUserId !== contract.user._id) return Boom.notFound();
    }

    return { message: translate[language].contractFound, data: { contract } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const contract = new Contract(req.payload);
    contract.version = [{
      startDate: req.payload.startDate,
      weeklyHours: req.payload.weeklyHours,
      grossHourlyRate: req.payload.grossHourlyRate,
    }];
    if (req.payload.signature) {
      const doc = await generateSignatureRequest(req.payload.signature);
      if (doc.data.error) return Boom.badRequest(`Eversign: ${doc.data.error.type}`);
      contract.versions[0].signature.eversignId = doc.data.document_hash;
      delete req.payload.signature;
    }
    await contract.save();

    await User.findOneAndUpdate({ _id: contract.user }, { $push: { contracts: contract._id }, $unset: { inactivityDate: '' } });
    if (contract.customer) await Customer.findOneAndUpdate({ _id: contract.customer }, { $push: { contracts: contract._id } });

    return {
      message: translate[language].contractCreated,
      data: { contract },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const contract = updateContract(req.params._id, req.payload, req.auth.credentials);
    if (!contract) return Boom.notFound(translate[language].contractNotFound);

    return {
      message: translate[language].contractUpdated,
      data: { contract },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
    return Boom.badImplementation(e);
  }
};

const createContractVersion = async (req) => {
  try {
    if (req.payload.signature) {
      const doc = await generateSignatureRequest(req.payload.signature);
      if (doc.data.error) return Boom.badRequest(`Eversign: ${doc.data.error.type}`);
      req.payload.signature = { eversignId: doc.data.document_hash };
    }
    const contract = await Contract.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { versions: req.payload } },
      { new: true, autopopulate: false }
    );

    return { message: translate[language].contractVersionAdded, data: { contract } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const updateContractVersion = async (req) => {
  try {
    const payload = { 'versions.$[version]': { ...req.payload } };
    const contract = await Contract.findOneAndUpdate(
      { _id: req.params._id },
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
      data: { contract },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const removeContractVersion = async (req) => {
  try {
    await Contract.findOneAndUpdate(
      { _id: req.params._id, 'versions._id': req.params.contractId },
      { $pull: { versions: { _id: req.params.versionId } } },
      { autopopulate: false }
    );

    return {
      message: translate[language].contractVersionRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
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
    return Boom.badImplementation(e);
  }
};

const receiveSignatureEvents = async (req, h) => {
  try {
    const signature = req.payload.event_hash;
    const validatePayload = `${req.payload.event_time}${req.payload.event_type}`;
    if (signature !== crypto.createHmac('sha256', process.env.EVERSIGN_API_KEY).update(validatePayload).digest('hex')) return Boom.forbidden();
    const docHash = req.payload.meta.related_document_hash;
    const everSignDoc = await ESign.getDocument(docHash);
    if (everSignDoc.data.error) return Boom.notFound(translate[language].documentNotFound);
    if (req.payload.event_type === 'document_signed') {
      const payload = req.payload.signer.id === '1' ? { 'versions.$.signature.signedBy.auxiliary': true } : { 'versions.$.signature.signedBy.other': true };
      await Contract.findOneAndUpdate({ 'versions.signature.eversignId': req.payload.meta.related_document_hash }, { $set: flat(payload) }, { new: true });
    } else if (req.payload.event_type === 'document_completed') {
      await saveCompletedContract(everSignDoc);
    }
    return h.response().code(200);
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
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
  receiveSignatureEvents,
};
