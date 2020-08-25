const sinon = require('sinon');
const expect = require('expect');
const Boom = require('@hapi/boom');
const Gdrive = require('../../../src/models/Google/Drive');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');

describe('addFile', () => {
  it('should add file to google drive', async () => {
    const addStub = sinon.stub(Gdrive, 'add').returns({ id: '123456780' });
    const payload = {
      name: 'Test',
      driveFolderId: '0987654321',
      type: 'application/pdf',
      body: 'This is a file',
    };

    const result = await GdriveStorageHelper.addFile(payload);

    expect(result).toEqual({ id: '123456780' });
    sinon.assert.calledWithExactly(addStub, {
      name: payload.name,
      parentFolderId: payload.driveFolderId,
      type: payload.type,
      body: payload.body,
      folder: false,
    });
    addStub.restore();
  });
});

describe('createFolder', () => {
  let addStub;
  const parentFolderId = '1234567890';

  beforeEach(() => {
    addStub = sinon.stub(Gdrive, 'add');
  });

  afterEach(() => {
    addStub.restore();
  });

  it('should create a folder in google drive (identity as string)', async () => {
    const identity = 'Test SAS';
    addStub.returns({ id: '123456780' });

    const result = await GdriveStorageHelper.createFolder(identity, parentFolderId);

    expect(result).toEqual({ id: '123456780' });
    sinon.assert.calledWithExactly(addStub, {
      name: identity,
      parentFolderId,
      folder: true,
    });
  });

  it('should create a folder in google drive (identity as object)', async () => {
    const identity = { firstname: 'Toto', lastname: 'Titi' };
    addStub.returns({ id: '123456780' });

    const result = await GdriveStorageHelper.createFolder(identity, parentFolderId);

    expect(result).toEqual({ id: '123456780' });
    sinon.assert.calledWithExactly(addStub, {
      name: `${identity.lastname.toUpperCase()} ${identity.firstname || ''}`,
      parentFolderId,
      folder: true,
    });
  });

  it('should throw a 422 error if folder creation fails', async () => {
    const identity = { firstname: 'Toto', lastname: 'Titi' };
    addStub.returns(null);

    try {
      await GdriveStorageHelper.createFolder(identity, parentFolderId);
    } catch (e) {
      expect(e).toEqual(Boom.failedDependency('Google drive folder creation failed.'));
    } finally {
      sinon.assert.calledWithExactly(addStub, {
        name: `${identity.lastname.toUpperCase()} ${identity.firstname || ''}`,
        parentFolderId,
        folder: true,
      });
    }
  });
});

describe('createFolderForCompany', () => {
  let addStub;

  beforeEach(() => {
    addStub = sinon.stub(Gdrive, 'add');
    process.env.GOOGLE_DRIVE_COMPANY_FOLDER_ID = '0987654321';
  });

  afterEach(() => {
    addStub.restore();
    delete process.env.GOOGLE_DRIVE_COMPANY_FOLDER_ID;
  });

  it('should create a company folder in google drive (identity as string)', async () => {
    const identity = 'Test SAS';
    addStub.returns({ id: '123456780' });

    const result = await GdriveStorageHelper.createFolderForCompany(identity);

    expect(result).toEqual({ id: '123456780' });
    sinon.assert.calledWithExactly(addStub, {
      name: identity,
      parentFolderId: '0987654321',
      folder: true,
    });
  });

  it('should throw a 422 error if folder creation fails', async () => {
    const identity = { firstname: 'Toto', lastname: 'Titi' };
    addStub.returns(null);
    try {
      await GdriveStorageHelper.createFolderForCompany(identity);
    } catch (e) {
      expect(e).toEqual(Boom.failedDependency('Google drive folder creation failed.'));
    } finally {
      sinon.assert.calledWithExactly(addStub, {
        name: identity,
        parentFolderId: '0987654321',
        folder: true,
      });
    }
  });
});
