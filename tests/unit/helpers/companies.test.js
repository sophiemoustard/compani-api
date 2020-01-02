const sinon = require('sinon');
const flat = require('flat');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Company = require('../../../src/models/Company');
const Event = require('../../../src/models/Event');
const CompanyHelper = require('../../../src/helpers/companies');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const Drive = require('../../../src/models/Google/Drive');

require('sinon-mongoose');

describe('createCompany', () => {
  let CompanyMock;
  let createFolderForCompanyStub;
  let createFolderStub;
  beforeEach(() => {
    CompanyMock = sinon.mock(Company);
    createFolderForCompanyStub = sinon.stub(GdriveStorageHelper, 'createFolderForCompany');
    createFolderStub = sinon.stub(GdriveStorageHelper, 'createFolder');
  });
  afterEach(() => {
    CompanyMock.restore();
    createFolderForCompanyStub.restore();
    createFolderStub.restore();
  });

  it('should create a company', async () => {
    const payload = { name: 'Test SAS', tradeName: 'Test' };
    const createdCompany = {
      ...payload,
      folderId: '1234567890',
      directDebitsFolderId: '0987654321',
      customersFolderId: 'qwertyuiop',
    };
    createFolderForCompanyStub.returns({ id: '1234567890' });
    createFolderStub.onCall(0).returns({ id: '0987654321' });
    createFolderStub.onCall(1).returns({ id: 'qwertyuiop' });
    CompanyMock.expects('find')
      .chain('sort')
      .withExactArgs({ prefixNumber: -1 })
      .chain('limit')
      .withExactArgs(1)
      .chain('lean')
      .once()
      .returns([{ _id: new ObjectID(), prefixNumber: 345 }]);
    CompanyMock.expects('create').withExactArgs({ ...createdCompany, prefixNumber: 346 }).once();

    await CompanyHelper.createCompany(payload);

    sinon.assert.calledWithExactly(createFolderForCompanyStub, payload.name);
    sinon.assert.calledWithExactly(createFolderStub, 'direct debits', '1234567890');
    sinon.assert.calledWithExactly(createFolderStub, 'customers', '1234567890');
    CompanyMock.verify();
  });
});

describe('uploadFile', () => {
  let CompanyModel;
  let addStub;
  let getFileByIdStub;
  beforeEach(() => {
    CompanyModel = sinon.mock(Company);
    addStub = sinon.stub(Drive, 'add');
    getFileByIdStub = sinon.stub(Drive, 'getFileById');
  });
  afterEach(() => {
    CompanyModel.restore();
    addStub.restore();
    getFileByIdStub.restore();
  });

  it('should upload a file', async () => {
    const payload = { fileName: 'mandat_signe', file: 'true', type: 'contractWithCompany' };
    const params = { _id: new ObjectID(), driveId: new ObjectID() };
    const uploadedFile = { id: new ObjectID() };
    const driveFileInfo = { webViewLink: 'test' };
    addStub.returns(uploadedFile);
    getFileByIdStub.returns(driveFileInfo);
    const companyPayload = {
      rhConfig: {
        templates: {
          contractWithCompany: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink },
        },
      },
    };
    CompanyModel
      .expects('findOneAndUpdate')
      .withExactArgs({ _id: params._id }, { $set: flat(companyPayload) }, { new: true })
      .chain('lean');

    await CompanyHelper.uploadFile(payload, params);
    sinon.assert.calledWithExactly(addStub, {
      body: 'true',
      folder: false,
      name: payload.fileName,
      parentFolderId: params.driveId,
      type: undefined,
    });
    sinon.assert.calledWithExactly(getFileByIdStub, { fileId: uploadedFile.id });
    CompanyModel.verify();
  });
});

describe('getFirstIntervention', () => {
  let EventModel;
  beforeEach(() => {
    EventModel = sinon.mock(Event);
  });
  afterEach(() => {
    EventModel.restore();
  });

  it('should get first intervention', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    EventModel
      .expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('sort')
      .withExactArgs({ startDate: 1 })
      .chain('limit')
      .withExactArgs(1)
      .chain('lean')
      .returns([{ startDate: '2019-11-12' }]);

    const result = await CompanyHelper.getFirstIntervention(credentials);

    expect(result).toBeDefined();
    expect(result).toEqual('2019-11-12');
    EventModel.verify();
  });
});
