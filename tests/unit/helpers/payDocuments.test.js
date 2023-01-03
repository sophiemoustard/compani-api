const Boom = require('@hapi/boom');
const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const PayDocument = require('../../../src/models/PayDocument');
const User = require('../../../src/models/User');
const PayDocumentHelper = require('../../../src/helpers/payDocuments');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const UtilsHelper = require('../../../src/helpers/utils');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let addFile;
  let create;
  let findOne;
  let formatIdentity;

  beforeEach(() => {
    addFile = sinon.stub(GDriveStorageHelper, 'addFile');
    create = sinon.stub(PayDocument, 'create');
    findOne = sinon.stub(User, 'findOne');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
  });

  afterEach(() => {
    addFile.restore();
    create.restore();
    findOne.restore();
    formatIdentity.restore();
  });

  it('should throw a 424 error if file is not uploaded to Google Drive', async () => {
    const userId = new ObjectId();
    const payload = { file: 'stream', mimeType: 'pdf', date: '2020-12-31T00:00:00', nature: 'payslip', user: userId };
    const credentials = { company: { _id: new ObjectId() } };
    findOne.returns(SinonMongoose.stubChainedQueries(
      { _id: userId, administrative: { driveFolder: { driveId: 'driveId' } }, identity: { lastname: 'lastname' } },
      ['lean']
    ));
    formatIdentity.returns('bonjour');
    addFile.returns(null);

    try {
      await PayDocumentHelper.create(payload, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.failedDependency('Google drive: File not uploaded'));
    } finally {
      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: userId }, { identity: 1, 'administrative.driveFolder': 1 }] },
          { query: 'lean' },
        ]
      );
      sinon.assert.calledWithExactly(formatIdentity, { lastname: 'lastname' }, 'FL');
      sinon.assert.calledWithExactly(addFile, {
        driveFolderId: 'driveId',
        name: 'bulletin_de_paie_31_12_2020_0000_bonjour',
        type: 'pdf',
        body: 'stream',
      });
      sinon.assert.notCalled(create);
    }
  });

  it('should save document to drive and db', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();
    const payload = { file: 'stream', mimeType: 'pdf', date: '2020-12-31T00:00:00', nature: 'payslip', user: userId };
    const credentials = { company: { _id: companyId } };
    findOne.returns(SinonMongoose.stubChainedQueries(
      { _id: userId, administrative: { driveFolder: { driveId: 'driveId' } }, identity: { lastname: 'lastname' } },
      ['lean']
    ));
    formatIdentity.returns('bonjour');
    addFile.returns({ id: '0987654321', webViewLink: 'http://test.com/test.pdf' });

    await PayDocumentHelper.create(payload, credentials);

    sinon.assert.calledWithExactly(
      addFile,
      { driveFolderId: 'driveId', name: 'bulletin_de_paie_31_12_2020_0000_bonjour', type: 'pdf', body: 'stream' }
    );
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: userId }, { identity: 1, 'administrative.driveFolder': 1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        company: companyId,
        date: '2020-12-31T00:00:00',
        nature: 'payslip',
        user: userId,
        file: { driveId: '0987654321', link: 'http://test.com/test.pdf' },
      }
    );
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

  it('should remove document from db and drive', async () => {
    const deleteFileStub = sinon.stub(GDriveStorageHelper, 'deleteFile');
    const id = new ObjectId();
    const doc = { file: { driveId: '1234567890', link: 'http://test.com/test.pdf' } };
    findByIdAndRemoveStub.returns(doc);
    await PayDocumentHelper.removeFromDriveAndDb(id);
    sinon.assert.calledWithExactly(findByIdAndRemoveStub, id);
    sinon.assert.calledWithExactly(deleteFileStub, doc.file.driveId);
    deleteFileStub.restore();
  });
});
