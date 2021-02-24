const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const Company = require('../../../src/models/Company');
const Drive = require('../../../src/models/Google/Drive');
const AdministrativeDocument = require('../../../src/models/AdministrativeDocument');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const AdministrativeDocumentHelper = require('../../../src/helpers/administrativeDocument');

require('sinon-mongoose');

describe('createAdministrativeDocument', () => {
  const companyId = new ObjectID();
  const credentials = { company: { _id: companyId } };
  const payload = { name: 'test', mimeType: 'pdf', file: 'file' };

  let CompanyMock;
  let AdministrativeDocumentMock;
  let addFileStub;
  let createPermissionStub;
  beforeEach(() => {
    CompanyMock = sinon.mock(Company);
    AdministrativeDocumentMock = sinon.mock(AdministrativeDocument);
    addFileStub = sinon.stub(GDriveStorageHelper, 'addFile');
    createPermissionStub = sinon.stub(Drive, 'createPermission');
  });

  afterEach(() => {
    CompanyMock.restore();
    AdministrativeDocumentMock.restore();
    addFileStub.restore();
    createPermissionStub.restore();
  });

  it('should create an administrative document', async () => {
    CompanyMock.expects('findById').withExactArgs(companyId).chain('lean').returns({ folderId: '1234' });
    const uploadedFile = { id: '12345', webViewLink: 'www.12345.fr' };
    addFileStub.returns(uploadedFile);
    const administrativeDocument = { company: companyId, name: payload.name };
    const administrativeDocumentModel = new AdministrativeDocument(administrativeDocument);
    const administrativeDocumentMock = sinon.mock(administrativeDocumentModel);

    AdministrativeDocumentMock
      .expects('create')
      .withExactArgs({ company: companyId, name: payload.name, driveFile: { driveId: '12345', link: 'www.12345.fr' } })
      .returns(administrativeDocumentModel);

    administrativeDocumentMock.expects('toObject').returns(administrativeDocument);

    const res = await AdministrativeDocumentHelper.createAdministrativeDocument(payload, credentials);

    expect(res).toEqual(administrativeDocument);
    sinon.assert.calledWithExactly(
      addFileStub,
      { driveFolderId: '1234', name: payload.name, type: payload.mimeType, body: payload.file }
    );
    sinon.assert.calledWithExactly(
      createPermissionStub,
      { fileId: uploadedFile.id, permission: { type: 'anyone', role: 'reader', allowFileDiscovery: false } }
    );
    administrativeDocumentMock.verify();
    AdministrativeDocumentMock.verify();
    CompanyMock.verify();
  });

  it('should return an error if uploaded file is not defined', async () => {
    try {
      CompanyMock.expects('findById').withExactArgs(companyId).chain('lean').returns({ folderId: '1234' });
      addFileStub.returns();
      AdministrativeDocumentMock.expects('create').never();

      await AdministrativeDocumentHelper.createAdministrativeDocument(payload, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.failedDependency('Google drive: File not uploaded'));
    } finally {
      sinon.assert.calledWithExactly(
        addFileStub,
        { driveFolderId: '1234', name: payload.name, type: payload.mimeType, body: payload.file }
      );
      sinon.assert.notCalled(createPermissionStub);
      AdministrativeDocumentMock.verify();
      CompanyMock.verify();
    }
  });
});

describe('listAdministrativeDocuments', () => {
  const companyId = new ObjectID();
  const credentials = { company: { _id: companyId } };

  let AdministrativeDocumentMock;
  beforeEach(() => {
    AdministrativeDocumentMock = sinon.mock(AdministrativeDocument);
  });

  afterEach(() => {
    AdministrativeDocumentMock.restore();
  });

  it('should create an administrative document', async () => {
    const administrativeDocuments = [{ _id: new ObjectID() }];
    AdministrativeDocumentMock
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(administrativeDocuments);

    const res = await AdministrativeDocumentHelper.listAdministrativeDocuments(credentials);

    expect(res).toEqual(administrativeDocuments);
    AdministrativeDocumentMock.verify();
  });
});

describe('removeAdministrativeDocument', () => {
  const administrativeDocumentId = new ObjectID();

  let AdministrativeDocumentMock;
  let deleteFileStub;
  beforeEach(() => {
    AdministrativeDocumentMock = sinon.mock(AdministrativeDocument);
    deleteFileStub = sinon.stub(GDriveStorageHelper, 'deleteFile');
  });

  afterEach(() => {
    AdministrativeDocumentMock.restore();
    deleteFileStub.restore();
  });

  it('should remove a document from bdd + drive', async () => {
    deleteFileStub.returns();
    AdministrativeDocumentMock
      .expects('findOneAndDelete')
      .withExactArgs({ _id: administrativeDocumentId })
      .chain('lean')
      .returns({ driveFile: { driveId: '1234' } });

    await AdministrativeDocumentHelper.removeAdministrativeDocument(administrativeDocumentId);

    sinon.assert.calledWithExactly(deleteFileStub, '1234');
    AdministrativeDocumentMock.verify();
  });
});
