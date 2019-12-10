const sinon = require('sinon');
const Company = require('../../../src/models/Company');
const CompanyHelper = require('../../../src/helpers/companies');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');

require('sinon-mongoose');

describe('createCompany', () => {
  it('should create a company', async () => {
    const CompanyMock = sinon.mock(Company);
    const createFolderForCompanyStub = sinon.stub(GdriveStorageHelper, 'createFolderForCompany');
    const createFolderStub = sinon.stub(GdriveStorageHelper, 'createFolder');
    const payload = { name: 'Test SAS', tradeName: 'Test' };

    createFolderForCompanyStub.returns({ id: '1234567890' });
    createFolderStub.returns({ id: '0987654321' });
    CompanyMock
      .expects('create')
      .withExactArgs({ ...payload, folderId: '1234567890', directDebitsFolderId: '0987654321' });

    await CompanyHelper.createCompany(payload);

    sinon.assert.calledWithExactly(
      createFolderForCompanyStub,
      payload.name
    );
    sinon.assert.calledWithExactly(createFolderStub, 'direct debits', '1234567890');
    CompanyMock.verify();
    CompanyMock.restore();
    createFolderForCompanyStub.restore();
    createFolderStub.restore();
  });
});
