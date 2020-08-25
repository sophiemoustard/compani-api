const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
require('sinon-mongoose');

const Bill = require('../../../src/models/Bill');
const Company = require('../../../src/models/Company');
const BillRepository = require('../../../src/repositories/BillRepository');
const EmailHelper = require('../../../src/helpers/email');
const billDispatch = require('../../../src/jobs/billDispatch');

describe('method', () => {
  let BillMock;
  let CompanyMock;
  let findBillsAndHelpersByCustomerStub;
  let billAlertEmailStub;
  let completeBillScriptEmailStub;
  let date;
  const fakeDate = new Date('2019-01-03');

  beforeEach(() => {
    BillMock = sinon.mock(Bill);
    CompanyMock = sinon.mock(Company);
    findBillsAndHelpersByCustomerStub = sinon.stub(BillRepository, 'findBillsAndHelpersByCustomer');
    billAlertEmailStub = sinon.stub(EmailHelper, 'billAlertEmail');
    completeBillScriptEmailStub = sinon.stub(EmailHelper, 'completeBillScriptEmail');
    date = sinon.useFakeTimers(fakeDate.getTime());
  });

  afterEach(() => {
    BillMock.restore();
    CompanyMock.restore();
    findBillsAndHelpersByCustomerStub.restore();
    billAlertEmailStub.restore();
    completeBillScriptEmailStub.restore();
    date.restore();
  });

  it('should email a bill to customers helpers', async () => {
    const server = 'server';
    const billsIds = [new ObjectID()];
    const companyId = new ObjectID();
    const customers = [
      {
        helpers: [
          { local: { email: 'leroi@lion.com' }, company: companyId },
          { local: { email: 'rox@rouky.com' }, company: companyId },
        ],
        bills: [{ _id: billsIds[0] }],
      },
    ];

    findBillsAndHelpersByCustomerStub.returns(customers);
    CompanyMock
      .expects('find')
      .chain('lean')
      .once()
      .returns([{ name: 'Alenvi', _id: companyId }]);

    billAlertEmailStub
      .onFirstCall()
      .returns(Promise.resolve('leroi@lion.com'))
      .onSecondCall()
      .returns(Promise.resolve('rox@rouky.com'));

    BillMock
      .expects('updateMany')
      .withArgs({ _id: { $in: billsIds } }, { $set: { sentAt: fakeDate } })
      .once();

    const result = await billDispatch.method(server);

    expect(result).toMatchObject({ results: ['leroi@lion.com', 'rox@rouky.com'], errors: [] });
    expect(billAlertEmailStub.callCount).toBe(2);
    expect(billAlertEmailStub.getCall(0).calledWithExactly('leroi@lion.com'));
    expect(billAlertEmailStub.getCall(1).calledWithExactly('rox@rouky.com'));
    BillMock.verify();
  });

  it('should log emails which can not be sent', async () => {
    const server = { log: (tags, text) => `${tags}, ${text}` };
    const serverLogStub = sinon.stub(server, 'log');
    const billsIds = [new ObjectID()];
    const error = new Error('Test error.');
    const companyId = new ObjectID();
    const customers = [
      {
        helpers: [
          { local: { email: 'leroi@lion.com' }, company: companyId },
          { local: { email: 'rox@rouky.com' }, company: companyId },
        ],
        bills: [{ _id: billsIds[0] }],
      },
    ];

    findBillsAndHelpersByCustomerStub.returns(customers);
    CompanyMock
      .expects('find')
      .chain('lean')
      .once()
      .returns([{ name: 'Alenvi', _id: companyId }]);

    billAlertEmailStub
      .onFirstCall()
      .returns(Promise.resolve('leroi@lion.com'))
      .onSecondCall()
      .returns(Promise.reject(error));

    BillMock
      .expects('updateMany')
      .never();

    const result = await billDispatch.method(server);

    expect(result).toMatchObject({ results: [], errors: ['leroi@lion.com', 'rox@rouky.com'] });
    expect(billAlertEmailStub.callCount).toBe(2);
    expect(billAlertEmailStub.getCall(0).calledWithExactly('leroi@lion.com'));
    expect(billAlertEmailStub.getCall(1).calledWithExactly('rox@rouky.com'));
    BillMock.verify();
    CompanyMock.verify();
    sinon.assert.calledWith(serverLogStub, ['error', 'cron', 'jobs'], error);
    serverLogStub.restore();
  });
});
