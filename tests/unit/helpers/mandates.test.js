const sinon = require('sinon');
const expect = require('expect');
const flat = require('flat');
const { ObjectID } = require('mongodb');
const Customer = require('../../../src/models/Customer');
const Drive = require('../../../src/models/Google/Drive');
const ESign = require('../../../src/models/ESign');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const MandatesHelper = require('../../../src/helpers/mandates');
const ESignHelper = require('../../../src/helpers/eSign');
const FileHelper = require('../../../src/helpers/file');

require('sinon-mongoose');

describe('getMandates', () => {
  let CustomerMock;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
  });
  afterEach(() => {
    CustomerMock.restore();
  });

  it('should return customer mandates', async () => {
    const customerId = (new ObjectID()).toHexString();
    CustomerMock.expects('findOne')
      .withExactArgs(
        { _id: customerId, 'payment.mandates': { $exists: true } },
        { identity: 1, 'payment.mandates': 1 },
        { autopopulate: false }
      )
      .chain('lean')
      .once();

    await MandatesHelper.getMandates(customerId);

    CustomerMock.verify();
  });
});

describe('updateMandate', () => {
  let CustomerMock;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
  });
  afterEach(() => {
    CustomerMock.restore();
  });

  it('should update customer mandates', async () => {
    const customerId = (new ObjectID()).toHexString();
    const mandateId = '1234567890';
    const payload = { startDate: '2019-12-12T00:00:00' };
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId, 'payment.mandates._id': mandateId },
        { $set: flat({ 'payment.mandates.$': { ...payload } }) },
        { new: true, select: { identity: 1, 'payment.mandates': 1 }, autopopulate: false }
      )
      .chain('lean')
      .once();

    await MandatesHelper.updateMandate(customerId, mandateId, payload);

    CustomerMock.verify();
  });
});

describe('getSignatureRequest', () => {
  let CustomerMock;
  let generateSignatureRequest;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    generateSignatureRequest = sinon.stub(ESignHelper, 'generateSignatureRequest');
  });
  afterEach(() => {
    CustomerMock.restore();
    generateSignatureRequest.restore();
  });

  it('should generate signature request', async () => {
    const customerId = (new ObjectID()).toHexString();
    const mandateId = new ObjectID();
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
      payment: { mandates: [{ _id: new ObjectID() }, { _id: mandateId, rum: 'rum' }] },
    };

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, 'payment.mandates._id': mandateId.toHexString() }, { payment: 1 })
      .chain('lean')
      .once()
      .returns(customer);
    generateSignatureRequest.returns({
      data: { document_hash: 'document_hash', signers: [{ embedded_signing_url: 'embedded_signing_url' }] },
    });
    CustomerMock.expects('updateOne')
      .withExactArgs(
        { _id: customerId, 'payment.mandates._id': mandateId.toHexString() },
        { $set: flat({ 'payment.mandates.$.everSignId': 'document_hash' }) }
      )
      .once();

    const result = await MandatesHelper.getSignatureRequest(customerId, mandateId.toHexString(), payload);

    expect(result).toEqual({ embeddedUrl: 'embedded_signing_url' });
    CustomerMock.verify();
  });

  it('should throw error if error on generate', async () => {
    try {
      const customerId = (new ObjectID()).toHexString();
      const mandateId = new ObjectID();
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
        payment: { mandates: [{ _id: new ObjectID() }, { _id: mandateId, rum: 'rum' }] },
      };

      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId, 'payment.mandates._id': mandateId.toHexString() }, { payment: 1 })
        .chain('lean')
        .once()
        .returns(customer);
      generateSignatureRequest.returns({ data: { error: 'error' } });
      CustomerMock.expects('updateOne').never();

      await MandatesHelper.getSignatureRequest(customerId, mandateId.toHexString(), payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(400);
    } finally {
      CustomerMock.verify();
    }
  });
});

describe('saveSignedMandate', () => {
  let CustomerMock;
  let getDocument;
  let downloadFinalDocument;
  let createAndReadFile;
  let addFile;
  let getFileById;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    getDocument = sinon.stub(ESign, 'getDocument');
    downloadFinalDocument = sinon.stub(ESign, 'downloadFinalDocument');
    createAndReadFile = sinon.stub(FileHelper, 'createAndReadFile');
    addFile = sinon.stub(GDriveStorageHelper, 'addFile');
    getFileById = sinon.stub(Drive, 'getFileById');
  });
  afterEach(() => {
    CustomerMock.restore();
    getDocument.restore();
    downloadFinalDocument.restore();
    createAndReadFile.restore();
    addFile.restore();
    getFileById.restore();
  });

  it('should save signed mandate', async () => {
    const customerId = '1234567890';
    const mandateId = new ObjectID();
    const customer = {
      _id: customerId,
      payment: { mandates: [{ _id: mandateId, everSignId: 'everSignId', rum: 'rum' }] },
      driveFolder: { driveId: 'driveFolder' },
    };
    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns(customer);
    getDocument.returns({ data: { log: [{ event: 'document_signed' }] } });
    downloadFinalDocument.returns({ data: 'data' });
    createAndReadFile.returns('file');
    addFile.returns({ id: 'fileId' });
    getFileById.returns({ webViewLink: 'webViewLink' });
    CustomerMock.expects('findOneAndUpdate')
      .chain('lean')
      .once()
      .returns(customer);

    await MandatesHelper.saveSignedMandate(customerId, mandateId.toHexString());

    sinon.assert.calledWithExactly(getDocument, 'everSignId');
    sinon.assert.calledWithExactly(downloadFinalDocument, 'everSignId');
    sinon.assert.called(createAndReadFile);
    sinon.assert.calledWithExactly(
      addFile,
      { driveFolderId: 'driveFolder', name: 'rum', type: 'application/pdf', body: 'file' }
    );
    sinon.assert.calledWithExactly(getFileById, { fileId: 'fileId' });
    CustomerMock.verify();
  });

  it('should throw an error if esign returns an error', async () => {
    try {
      const customerId = '1234567890';
      const mandateId = new ObjectID();
      const customer = {
        _id: customerId,
        payment: { mandates: [{ _id: mandateId, everSignId: 'everSignId', rum: 'rum' }] },
        driveFolder: { driveId: 'driveFolder' },
      };
      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('lean')
        .once()
        .returns(customer);
      getDocument.returns({ data: { error: 'error', log: [{ event: 'document_signed' }] } });
      CustomerMock.expects('findOneAndUpdate').never();

      await MandatesHelper.saveSignedMandate(customerId, mandateId.toHexString());
    } catch (e) {
      expect(e.output.statusCode).toEqual(404);
    } finally {
      sinon.assert.calledWithExactly(getDocument, 'everSignId');
      sinon.assert.notCalled(downloadFinalDocument);
      sinon.assert.notCalled(createAndReadFile);
      sinon.assert.notCalled(addFile);
      sinon.assert.notCalled(getFileById);
      CustomerMock.verify();
    }
  });

  it('should throw an error if no signed doc in esign response', async () => {
    try {
      const customerId = '1234567890';
      const mandateId = new ObjectID();
      const customer = {
        _id: customerId,
        payment: { mandates: [{ _id: mandateId, everSignId: 'everSignId', rum: 'rum' }] },
        driveFolder: { driveId: 'driveFolder' },
      };
      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('lean')
        .once()
        .returns(customer);
      getDocument.returns({ data: { log: [{ event: 'document_not_signed' }] } });
      CustomerMock.expects('findOneAndUpdate').never();

      await MandatesHelper.saveSignedMandate(customerId, mandateId.toHexString());
    } catch (e) {
      expect(e.output.statusCode).toEqual(503);
    } finally {
      sinon.assert.calledWithExactly(getDocument, 'everSignId');
      sinon.assert.notCalled(downloadFinalDocument);
      sinon.assert.notCalled(createAndReadFile);
      sinon.assert.notCalled(addFile);
      sinon.assert.notCalled(getFileById);
      CustomerMock.verify();
    }
  });
});
