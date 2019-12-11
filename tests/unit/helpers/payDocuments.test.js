const Boom = require('boom');
const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');

const PayDocument = require('../../../src/models/PayDocument');
const PayDocumentHelper = require('../../../src/helpers/payDocuments');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const translate = require('../../../src/helpers/translate');

const { language } = translate;

describe('create', () => {
  let addFileStub;
  let saveStub;
  const payload = {
    driveFolderId: '1234567890',
    fileName: 'test',
    payDoc: 'stream',
    mimeType: 'application/pdf',
    date: new Date().toISOString(),
    nature: 'test',
    user: new ObjectID(),
  };
  const credentials = { company: { _id: new ObjectID() } };

  beforeEach(() => {
    addFileStub = sinon.stub(GdriveStorageHelper, 'addFile');
    saveStub = sinon.stub(PayDocument.prototype, 'save');
  });

  afterEach(() => {
    addFileStub.restore();
    saveStub.restore();
  });

  it('should throw a 424 error if file is not uploaded to Google Drive', async () => {
    addFileStub.returns(null);
    try {
      await PayDocumentHelper.create(payload, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.failedDependency('Google drive: File not uploaded'));
    }
    sinon.assert.calledWith(addFileStub, {
      driveFolderId: '1234567890',
      name: 'test',
      type: 'application/pdf',
      body: 'stream',
    });
  });

  it('should save document to drive and db', async () => {
    addFileStub.returns({ id: '0987654321', webViewLink: 'http://test.com/test.pdf' });
    await PayDocumentHelper.create(payload, credentials);
    sinon.assert.calledWith(addFileStub, {
      driveFolderId: '1234567890',
      name: 'test',
      type: 'application/pdf',
      body: 'stream',
    });
    sinon.assert.calledOnce(saveStub);
  });
});

describe('removeFromDriveAndDb', () => {
  let findByIdAndRemoveStub;
  beforeEach(() => {
    findByIdAndRemoveStub = sinon.stub(PayDocument, 'findByIdAndRemove');
  });
  afterEach(() => {
    findByIdAndRemoveStub.restore();
  });

  it('should not call deleteFile if document does not exists', async () => {
    const deleteFileStub = sinon.stub(GdriveStorageHelper, 'deleteFile');
    const id = new ObjectID();
    findByIdAndRemoveStub.returns();

    await PayDocumentHelper.removeFromDriveAndDb(id);

    sinon.assert.calledWith(findByIdAndRemoveStub, id);
    sinon.assert.notCalled(deleteFileStub);
    deleteFileStub.restore();
  });

  it('should remove document from db and drive', async () => {
    const deleteFileStub = sinon.stub(GdriveStorageHelper, 'deleteFile');
    const id = new ObjectID();
    const doc = { file: { driveId: '1234567890', link: 'http://test.com/test.pdf' } };
    findByIdAndRemoveStub.returns(doc);
    await PayDocumentHelper.removeFromDriveAndDb(id);
    sinon.assert.calledWith(findByIdAndRemoveStub, id);
    sinon.assert.calledWith(deleteFileStub, doc.file.driveId);
    deleteFileStub.restore();
  });
});
