const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');

const Bill = require('../../../src/models/Bill');
const Company = require('../../../src/models/Company');
const BillRepository = require('../../../src/repositories/BillRepository');
const EmailHelper = require('../../../src/helpers/email');
const billDispatch = require('../../../src/jobs/billDispatch');
const SinonMongoose = require('../sinonMongoose');

describe('method', () => {
  let updateManyBill;
  let findCompany;
  let findBillsAndHelpersByCustomerStub;
  let billAlertEmailStub;
  let completeBillScriptEmailStub;
  let date;
  const fakeDate = new Date('2019-01-03');

  beforeEach(() => {
    updateManyBill = sinon.stub(Bill, 'updateMany');
    findCompany = sinon.stub(Company, 'find');
    findBillsAndHelpersByCustomerStub = sinon.stub(BillRepository, 'findBillsAndHelpersByCustomer');
    billAlertEmailStub = sinon.stub(EmailHelper, 'billAlertEmail');
    completeBillScriptEmailStub = sinon.stub(EmailHelper, 'completeBillScriptEmail');
    date = sinon.useFakeTimers(fakeDate.getTime());
  });

  afterEach(() => {
    updateManyBill.restore();
    findCompany.restore();
    findBillsAndHelpersByCustomerStub.restore();
    billAlertEmailStub.restore();
    completeBillScriptEmailStub.restore();
    date.restore();
  });

  it('should email a bill to customers helpers', async () => {
    const server = 'server';
    const billsIds = [new ObjectId()];
    const companyId = new ObjectId();
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
    findCompany.returns(SinonMongoose.stubChainedQueries([{ name: 'Alenvi', _id: companyId }], ['lean']));
    billAlertEmailStub
      .onFirstCall()
      .returns(Promise.resolve('leroi@lion.com'))
      .onSecondCall()
      .returns(Promise.resolve('rox@rouky.com'));

    const result = await billDispatch.method(server);

    expect(result).toMatchObject({ results: ['leroi@lion.com', 'rox@rouky.com'], errors: [] });
    expect(billAlertEmailStub.callCount).toBe(2);
    expect(billAlertEmailStub.getCall(0).calledWithExactly('leroi@lion.com'));
    expect(billAlertEmailStub.getCall(1).calledWithExactly('rox@rouky.com'));
    sinon.assert.calledOnceWithExactly(updateManyBill, { _id: { $in: billsIds } }, { $set: { sentAt: fakeDate } });
    SinonMongoose.calledOnceWithExactly(findCompany, [{ query: 'find' }, { query: 'lean' }]);
  });

  it('should log emails which can not be sent', async () => {
    const server = { log: (tags, text) => `${tags}, ${text}` };
    const serverLogStub = sinon.stub(server, 'log');
    const billsIds = [new ObjectId()];
    const error = new Error('Test error.');
    const companyId = new ObjectId();
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
    findCompany.returns(SinonMongoose.stubChainedQueries([{ name: 'Alenvi', _id: companyId }], ['lean']));
    billAlertEmailStub
      .onFirstCall()
      .returns(Promise.resolve('leroi@lion.com'))
      .onSecondCall()
      .returns(Promise.reject(error));

    const result = await billDispatch.method(server);

    expect(result).toMatchObject({ results: [], errors: ['leroi@lion.com', 'rox@rouky.com'] });
    expect(billAlertEmailStub.callCount).toBe(2);
    expect(billAlertEmailStub.getCall(0).calledWithExactly('leroi@lion.com'));
    expect(billAlertEmailStub.getCall(1).calledWithExactly('rox@rouky.com'));
    sinon.assert.calledWith(serverLogStub, ['error', 'cron', 'jobs'], error);
    sinon.assert.notCalled(updateManyBill);
    SinonMongoose.calledOnceWithExactly(findCompany, [{ query: 'find' }, { query: 'lean' }]);
    serverLogStub.restore();
  });
});
