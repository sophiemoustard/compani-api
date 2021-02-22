const sinon = require('sinon');
const expect = require('expect');
const Boom = require('@hapi/boom');
const Gdrive = require('../../../src/models/Google/Drive');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');

describe('addFile', () => {
  it('should add file to google drive', async () => {
    const addStub = sinon.stub(Gdrive, 'add').returns({ id: '123456780' });
    const payload = {
      name: 'Test',
      driveFolderId: '0987654321',
      type: 'application/pdf',
      body: 'This is a file',
    };

    const result = await GDriveStorageHelper.addFile(payload);

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

    const result = await GDriveStorageHelper.createFolder(identity, parentFolderId);

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

    const result = await GDriveStorageHelper.createFolder(identity, parentFolderId);

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
      await GDriveStorageHelper.createFolder(identity, parentFolderId);
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

    const result = await GDriveStorageHelper.createFolderForCompany(identity);

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
      await GDriveStorageHelper.createFolderForCompany(identity);
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

describe('deleteFile', () => {
  let deleteFile;

  beforeEach(() => {
    deleteFile = sinon.stub(Gdrive, 'deleteFile');
    process.env.NODE_ENV = 'sku';
  });

  afterEach(() => {
    deleteFile.restore();
    delete process.env.NODE_ENV;
  });

  it('should delete a file in google drive', async () => {
    await GDriveStorageHelper.deleteFile('skusku');

    sinon.assert.calledWithExactly(deleteFile, { fileId: 'skusku' });
  });

  it('should not throw an error if file doesn\'t exists', async () => {
    try {
      deleteFile.throws('File not found');
      await GDriveStorageHelper.deleteFile('skusku');
    } catch (e) {
      expect(0).toBe(1);
    } finally {
      sinon.assert.calledWithExactly(deleteFile, { fileId: 'skusku' });
    }
  });

  it('should not throw an error if user can\'t access file', async () => {
    try {
      deleteFile.throws('The user does not have sufficient permissions for this file.');
      await GDriveStorageHelper.deleteFile('skusku');
    } catch (e) {
      expect(0).toBe(1);
    } finally {
      sinon.assert.calledWithExactly(deleteFile, { fileId: 'skusku' });
    }
  });

  it('should throw a 424 error if file deletion throws unexpected error', async () => {
    try {
      deleteFile.throws('Unknown error');
      await GDriveStorageHelper.deleteFile('skusku');
    } catch (e) {
      expect(e).toEqual(Boom.failedDependency('Google drive file deletion failed.'));
    } finally {
      sinon.assert.calledWithExactly(deleteFile, { fileId: 'skusku' });
    }
  });
});
