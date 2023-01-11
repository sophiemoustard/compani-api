const sinon = require('sinon');
const { expect } = require('expect');
const flat = require('flat');
const { ObjectId } = require('mongodb');
const { fn: momentProto } = require('moment');
const Customer = require('../../../src/models/Customer');
const Drive = require('../../../src/models/Google/Drive');
const ESign = require('../../../src/models/ESign');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const MandatesHelper = require('../../../src/helpers/mandates');
const ESignHelper = require('../../../src/helpers/eSign');
const FileHelper = require('../../../src/helpers/file');
const SinonMongoose = require('../sinonMongoose');

describe('getMandates', () => {
  let findOneCustomer;
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
  });
  afterEach(() => {
    findOneCustomer.restore();
  });

  it('should return customer mandates', async () => {
    const customerId = (new ObjectId()).toHexString();
    const mandate = { _id: new ObjectId() };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries(mandate, ['lean']));

    const result = await MandatesHelper.getMandates(customerId);

    expect(result).toMatchObject(mandate);
    SinonMongoose.calledOnceWithExactly(
      findOneCustomer,
      [
        {
          query: 'findOne',
          args: [
            { _id: customerId, 'payment.mandates': { $exists: true } },
            { identity: 1, 'payment.mandates': 1 },
            { autopopulate: false },
          ],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('updateMandate', () => {
  let findOneAndUpdateCustomer;
  beforeEach(() => {
    findOneAndUpdateCustomer = sinon.stub(Customer, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdateCustomer.restore();
  });

  it('should update customer mandates', async () => {
    const customerId = (new ObjectId()).toHexString();
    const mandateId = '1234567890';
    const payload = { startDate: '2019-12-12T00:00:00' };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries({ ...payload, _id: mandateId }, ['lean']));

    const result = await MandatesHelper.updateMandate(customerId, mandateId, payload);

    expect(result).toMatchObject({ ...payload, _id: mandateId });
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId, 'payment.mandates._id': mandateId },
            { $set: flat({ 'payment.mandates.$': { ...payload } }) },
            { new: true, select: { identity: 1, 'payment.mandates': 1 }, autopopulate: false },
          ],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('getSignatureRequest', () => {
  let findOneCustomer;
  let updateOneCustomer;
  let generateSignatureRequest;
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
    updateOneCustomer = sinon.stub(Customer, 'updateOne');
    generateSignatureRequest = sinon.stub(ESignHelper, 'generateSignatureRequest');
  });
  afterEach(() => {
    findOneCustomer.restore();
    updateOneCustomer.restore();
    generateSignatureRequest.restore();
  });

  it('should generate signature request', async () => {
    const customerId = (new ObjectId()).toHexString();
    const mandateId = new ObjectId();
    const payload = {
      fileId: 'fileId',
      fields: 'fields',
      title: 'MANDAT SEPA rum',
      customer: { name: 'qwertyuiop', email: 'toto@toto.com' },
      redirect: 'redirect',
      redirectDecline: 'redirectDecline',
    };
    const customer = {
      _id: customerId,
      payment: { mandates: [{ _id: new ObjectId() }, { _id: mandateId, rum: 'rum' }] },
    };
    findOneCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
    generateSignatureRequest.returns({
      data: { document_hash: 'document_hash', signers: [{ embedded_signing_url: 'embedded_signing_url' }] },
    });

    const result = await MandatesHelper.getSignatureRequest(customerId, mandateId.toHexString(), payload);

    expect(result).toEqual({ embeddedUrl: 'embedded_signing_url' });
    sinon.assert.calledOnceWithExactly(
      updateOneCustomer,
      { _id: customerId, 'payment.mandates._id': mandateId.toHexString() },
      { $set: flat({ 'payment.mandates.$.everSignId': 'document_hash' }) }
    );
    SinonMongoose.calledOnceWithExactly(
      findOneCustomer,
      [
        {
          query: 'findOne',
          args: [{ _id: customerId, 'payment.mandates._id': mandateId.toHexString() }, { payment: 1 }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should throw error if error on generate', async () => {
    const customerId = (new ObjectId()).toHexString();
    const mandateId = new ObjectId();
    try {
      const payload = {
        fileId: 'fileId',
        fields: 'fields',
        title: 'MANDAT SEPA rum',
        customer: { name: 'qwertyuiop', email: 'toto@toto.com' },
        redirect: 'redirect',
        redirectDecline: 'redirectDecline',
      };
      const customer = {
        _id: customerId,
        payment: { mandates: [{ _id: new ObjectId() }, { _id: mandateId, rum: 'rum' }] },
      };

      findOneCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
      generateSignatureRequest.returns({ data: { error: 'error' } });

      await MandatesHelper.getSignatureRequest(customerId, mandateId.toHexString(), payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(400);
    } finally {
      sinon.assert.notCalled(updateOneCustomer);
      SinonMongoose.calledOnceWithExactly(
        findOneCustomer,
        [
          {
            query: 'findOne',
            args: [{ _id: customerId, 'payment.mandates._id': mandateId.toHexString() }, { payment: 1 }],
          },
          { query: 'lean' },
        ]
      );
    }
  });
});

describe('saveSignedMandate', () => {
  let findOneCustomer;
  let findOneAndUpdateCustomer;
  let getDocument;
  let downloadFinalDocument;
  let createReadAndReturnFile;
  let addFile;
  let getFileById;
  let momentToDate;
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
    findOneAndUpdateCustomer = sinon.stub(Customer, 'findOneAndUpdate');
    getDocument = sinon.stub(ESign, 'getDocument');
    downloadFinalDocument = sinon.stub(ESign, 'downloadFinalDocument');
    createReadAndReturnFile = sinon.stub(FileHelper, 'createReadAndReturnFile');
    addFile = sinon.stub(GDriveStorageHelper, 'addFile');
    getFileById = sinon.stub(Drive, 'getFileById');
    momentToDate = sinon.stub(momentProto, 'toDate');
  });
  afterEach(() => {
    findOneCustomer.restore();
    findOneAndUpdateCustomer.restore();
    getDocument.restore();
    downloadFinalDocument.restore();
    createReadAndReturnFile.restore();
    addFile.restore();
    getFileById.restore();
    momentToDate.restore();
  });

  it('should save signed mandate', async () => {
    const customerId = '1234567890';
    const mandateId = new ObjectId();
    const customer = {
      _id: customerId,
      payment: { mandates: [{ _id: mandateId, everSignId: 'everSignId', rum: 'rum' }] },
      driveFolder: { driveId: 'driveFolder' },
    };
    const drive = { driveId: 'fileId', link: 'webViewLink' };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    getDocument.returns({ data: { log: [{ event: 'document_signed' }] } });
    downloadFinalDocument.returns({ data: 'data' });
    createReadAndReturnFile.returns('file');
    addFile.returns({ id: 'fileId' });
    getFileById.returns({ webViewLink: 'webViewLink' });
    momentToDate.returns('2020-12-08T13:45:25.437Z');

    await MandatesHelper.saveSignedMandate(customerId, mandateId.toHexString());

    sinon.assert.calledWithExactly(getDocument, 'everSignId');
    sinon.assert.calledWithExactly(downloadFinalDocument, 'everSignId');
    sinon.assert.called(createReadAndReturnFile);
    sinon.assert.calledWithExactly(
      addFile,
      { driveFolderId: 'driveFolder', name: 'rum', type: 'application/pdf', body: 'file' }
    );
    sinon.assert.calledWithExactly(getFileById, { fileId: 'fileId' });
    SinonMongoose.calledOnceWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId, 'payment.mandates._id': mandateId.toHexString() },
            { $set: flat({ 'payment.mandates.$': { drive, signedAt: '2020-12-08T13:45:25.437Z' } }) },
          ],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should throw an error if esign returns an error', async () => {
    const customerId = '1234567890';
    try {
      const mandateId = new ObjectId();
      const customer = {
        _id: customerId,
        payment: { mandates: [{ _id: mandateId, everSignId: 'everSignId', rum: 'rum' }] },
        driveFolder: { driveId: 'driveFolder' },
      };

      findOneCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
      getDocument.returns({ data: { error: 'error', log: [{ event: 'document_signed' }] } });

      await MandatesHelper.saveSignedMandate(customerId, mandateId.toHexString());
    } catch (e) {
      expect(e.output.statusCode).toEqual(404);
    } finally {
      sinon.assert.calledWithExactly(getDocument, 'everSignId');
      sinon.assert.notCalled(downloadFinalDocument);
      sinon.assert.notCalled(createReadAndReturnFile);
      sinon.assert.notCalled(addFile);
      sinon.assert.notCalled(getFileById);
      sinon.assert.notCalled(findOneAndUpdateCustomer);
      SinonMongoose.calledOnceWithExactly(
        findOneCustomer,
        [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
      );
    }
  });

  it('should throw an error if no signed doc in esign response', async () => {
    const customerId = '1234567890';
    try {
      const mandateId = new ObjectId();
      const customer = {
        _id: customerId,
        payment: { mandates: [{ _id: mandateId, everSignId: 'everSignId', rum: 'rum' }] },
        driveFolder: { driveId: 'driveFolder' },
      };

      findOneCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
      getDocument.returns({ data: { log: [{ event: 'document_not_signed' }] } });

      await MandatesHelper.saveSignedMandate(customerId, mandateId.toHexString());
    } catch (e) {
      expect(e.output.statusCode).toEqual(503);
    } finally {
      sinon.assert.calledWithExactly(getDocument, 'everSignId');
      sinon.assert.notCalled(downloadFinalDocument);
      sinon.assert.notCalled(createReadAndReturnFile);
      sinon.assert.notCalled(addFile);
      sinon.assert.notCalled(getFileById);
      sinon.assert.notCalled(findOneAndUpdateCustomer);
      SinonMongoose.calledOnceWithExactly(
        findOneCustomer,
        [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
      );
    }
  });
});
