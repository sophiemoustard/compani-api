const { ObjectId } = require('mongodb');
const { expect } = require('expect');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const Company = require('../../../src/models/Company');
const Drive = require('../../../src/models/Google/Drive');
const AdministrativeDocument = require('../../../src/models/AdministrativeDocument');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const AdministrativeDocumentHelper = require('../../../src/helpers/administrativeDocument');
const SinonMongoose = require('../sinonMongoose');

describe('createAdministrativeDocument', () => {
  const companyId = new ObjectId();
  const credentials = { company: { _id: companyId } };
  const payload = { name: 'test', mimeType: 'pdf', file: 'file' };

  let findByIdCompany;
  let createAdministrativeDocument;
  let addFileStub;
  let createPermissionStub;
  beforeEach(() => {
    findByIdCompany = sinon.stub(Company, 'findById');
    createAdministrativeDocument = sinon.stub(AdministrativeDocument, 'create');
    addFileStub = sinon.stub(GDriveStorageHelper, 'addFile');
    createPermissionStub = sinon.stub(Drive, 'createPermission');
  });

  afterEach(() => {
    findByIdCompany.restore();
    createAdministrativeDocument.restore();
    addFileStub.restore();
    createPermissionStub.restore();
  });

  it('should create an administrative document', async () => {
    const uploadedFile = { id: '12345', webViewLink: 'www.12345.fr' };
    addFileStub.returns(uploadedFile);

    findByIdCompany.returns(SinonMongoose.stubChainedQueries({ folderId: '1234' }, ['lean']));

    await AdministrativeDocumentHelper.createAdministrativeDocument(payload, credentials);

    sinon.assert.calledWithExactly(
      addFileStub,
      { driveFolderId: '1234', name: payload.name, type: payload.mimeType, body: payload.file }
    );
    sinon.assert.calledWithExactly(
      createPermissionStub,
      { fileId: uploadedFile.id, permission: { type: 'anyone', role: 'reader', allowFileDiscovery: false } }
    );
    sinon.assert.calledWithExactly(
      createAdministrativeDocument,
      { company: companyId, name: payload.name, driveFile: { driveId: '12345', link: 'www.12345.fr' } }
    );
    SinonMongoose.calledOnceWithExactly(findByIdCompany, [{ query: 'findById', args: [companyId] }, { query: 'lean' }]);
  });

  it('should return an error if uploaded file is not defined', async () => {
    try {
      addFileStub.returns();
      findByIdCompany.returns(SinonMongoose.stubChainedQueries({ folderId: '1234' }, ['lean']));

      await AdministrativeDocumentHelper.createAdministrativeDocument(payload, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.failedDependency('Google drive: File not uploaded'));
    } finally {
      sinon.assert.calledWithExactly(
        addFileStub,
        { driveFolderId: '1234', name: payload.name, type: payload.mimeType, body: payload.file }
      );
      sinon.assert.notCalled(createPermissionStub);
      sinon.assert.notCalled(createAdministrativeDocument);
      SinonMongoose.calledOnceWithExactly(
        findByIdCompany,
        [{ query: 'findById', args: [companyId] }, { query: 'lean' }]
      );
    }
  });
});

describe('listAdministrativeDocuments', () => {
  const companyId = new ObjectId();
  const credentials = { company: { _id: companyId } };

  let findAdministrativeDocument;
  beforeEach(() => {
    findAdministrativeDocument = sinon.stub(AdministrativeDocument, 'find');
  });

  afterEach(() => {
    findAdministrativeDocument.restore();
  });

  it('should create an administrative document', async () => {
    const administrativeDocuments = [{ _id: new ObjectId() }];

    findAdministrativeDocument.returns(SinonMongoose.stubChainedQueries(administrativeDocuments, ['lean']));

    const res = await AdministrativeDocumentHelper.listAdministrativeDocuments(credentials);

    expect(res).toEqual(administrativeDocuments);
    SinonMongoose.calledOnceWithExactly(
      findAdministrativeDocument,
      [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]
    );
  });
});

describe('removeAdministrativeDocument', () => {
  const administrativeDocumentId = new ObjectId();

  let findOneAndDelete;
  let deleteFileStub;
  beforeEach(() => {
    findOneAndDelete = sinon.stub(AdministrativeDocument, 'findOneAndDelete');
    deleteFileStub = sinon.stub(GDriveStorageHelper, 'deleteFile');
  });

  afterEach(() => {
    findOneAndDelete.restore();
    deleteFileStub.restore();
  });

  it('should remove a document from bdd + drive', async () => {
    deleteFileStub.returns();
    findOneAndDelete.returns(SinonMongoose.stubChainedQueries({ driveFile: { driveId: '1234' } }, ['lean']));

    await AdministrativeDocumentHelper.removeAdministrativeDocument(administrativeDocumentId);

    sinon.assert.calledWithExactly(deleteFileStub, '1234');
    SinonMongoose.calledOnceWithExactly(
      findOneAndDelete,
      [{ query: 'findOneAndDelete', args: [{ _id: administrativeDocumentId }] }, { query: 'lean' }]
    );
  });
});
