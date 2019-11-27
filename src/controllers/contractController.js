const Boom = require('boom');
const flat = require('flat');
const crypto = require('crypto');
const Contract = require('../models/Contract');
const User = require('../models/User');
const Customer = require('../models/Customer');
const ESign = require('../models/ESign');
const translate = require('../helpers/translate');
const {
  createContract,
  createVersion,
  endContract,
  createAndSaveFile,
  saveCompletedContract,
  updateVersion,
  deleteVersion,
  getContractList,
} = require('../helpers/contracts');
const ContractRepository = require('../repositories/ContractRepository');

const { language } = translate;

const list = async (req) => {
  try {
    const contracts = await getContractList(req.query, req.auth.credentials);

    const message = contracts.length ? translate[language].contractsFound : translate[language].contractsNotFound;

    return { message, data: { contracts } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const { payload, auth } = req;
    const contract = await createContract(payload, auth.credentials);

    return {
      message: translate[language].contractCreated,
      data: { contract },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const contract = await endContract(req.params._id, req.payload, req.auth.credentials);
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
    const contract = await Contract.findOneAndRemove({ _id: req.params._id });
    if (!contract) return Boom.notFound(translate[language].contractNotFound);

    await User.findOneAndUpdate({ _id: contract.user }, { $pull: { contracts: contract._id } });
    if (contract.customer) await Customer.findOneAndUpdate({ _id: contract.customer }, { $pull: { contracts: contract._id } });

    return {
      message: translate[language].contractDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createContractVersion = async (req) => {
  try {
    const contract = await createVersion(req.params._id, req.payload);
    if (!contract) return Boom.notFound(translate[language].contractNotFound);

    return { message: translate[language].contractVersionAdded, data: { contract } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateContractVersion = async (req) => {
  try {
    const contract = await updateVersion(req.params._id, req.params.versionId, req.payload);
    if (!contract) return Boom.notFound(translate[language].contractNotFound);

    return {
      message: translate[language].contractVersionUpdated,
      data: { contract },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const removeContractVersion = async (req) => {
  try {
    await deleteVersion(req.params._id, req.params.versionId);

    return { message: translate[language].contractVersionRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const uploadFile = async (req) => {
  try {
    const allowedFields = ['signedContract', 'signedVersion'];
    const administrativeKeys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    if (administrativeKeys.length === 0) return Boom.forbidden(translate[language].uploadNotAllowed);

    const { params, payload } = req;
    const fileInfo = {
      auxiliaryDriveId: params.driveId,
      name: payload.fileName || payload[administrativeKeys[0]].hapi.filename,
      type: payload['Content-Type'],
      body: payload[administrativeKeys[0]],
    };
    const version = { customer: payload.customer, contractId: params._id, _id: payload.versionId, status: payload.status };

    const uploadedFile = await createAndSaveFile(version, fileInfo);

    return { message: translate[language].fileCreated, data: { uploadedFile } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getStaffRegister = async (req) => {
  try {
    const { credentials } = req.auth;
    const staffRegister = await ContractRepository.getStaffRegister(credentials.company._id);

    return {
      message: translate[language].staffRegisteredFound,
      data: { staffRegister },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
  createContractVersion,
  updateContractVersion,
  removeContractVersion,
  uploadFile,
  receiveSignatureEvents,
  getStaffRegister,
};
