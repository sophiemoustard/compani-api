const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
require('sinon-mongoose');

const Bill = require('../../../models/Bill');
const BillRepository = require('../../../repositories/BillRepository');
const EmailHelper = require('../../../helpers/email');
const billDispatch = require('../../../jobs/billDispatch');


describe('method', () => {
  let BillMock;
  let findBillsAndHelpersByCustomerStub;
  let billAlertEmailStub;
  let completeBillScriptEmailStub;
  let billDispatchOnCompleteStub;
  let date;
  const fakeDate = new Date('2019-01-03');

  beforeEach(() => {
    BillMock = sinon.mock(Bill);
    findBillsAndHelpersByCustomerStub = sinon.stub(BillRepository, 'findBillsAndHelpersByCustomer');
    billAlertEmailStub = sinon.stub(EmailHelper, 'billAlertEmail');
    completeBillScriptEmailStub = sinon.stub(EmailHelper, 'completeBillScriptEmail');
    billDispatchOnCompleteStub = sinon.stub(billDispatch, 'onComplete');
    date = sinon.useFakeTimers(fakeDate.getTime());
  });

  afterEach(() => {
    BillMock.restore();
    findBillsAndHelpersByCustomerStub.restore();
    billAlertEmailStub.restore();
    completeBillScriptEmailStub.restore();
    billDispatchOnCompleteStub.restore();
    date.restore();
  });

  it('should email an invoice to customers helpers', async () => {
    const server = 'server';
    const billsIds = [new ObjectID()];
    const customers = [{
      helpers: [{ local: { email: 'leroi@lion.com' } }, { local: { email: 'rox@rouky.com' } }],
      bills: [{ _id: billsIds[0] }],
    }];

    findBillsAndHelpersByCustomerStub.returns(customers);

    billAlertEmailStub
      .onFirstCall()
      .returns(new Promise(resolve => resolve('leroi@lion.com')))
      .onSecondCall()
      .returns(new Promise(resolve => resolve('rox@rouky.com')));

    BillMock
      .expects('updateMany')
      .withArgs({ _id: { $in: billsIds } }, { $set: { sent: fakeDate } })
      .once();

    await billDispatch.method(server);
    expect(billAlertEmailStub.callCount).toBe(2);
    expect(billAlertEmailStub.getCall(0).calledWithExactly('leroi@lion.com'));
    expect(billAlertEmailStub.getCall(1).calledWithExactly('rox@rouky.com'));
    BillMock.verify();
    sinon.assert.calledWith(billDispatchOnCompleteStub, server, ['leroi@lion.com', 'rox@rouky.com'], []);
  });

  it('should log emails which can not be sent', async () => {
    const server = { log: (tags, text) => `${tags}, ${text}` };
    const serverLogStub = sinon.stub(server, 'log');
    const billsIds = [new ObjectID()];
    const error = new Error('Test error.');
    const customers = [{
      helpers: [{ local: { email: 'leroi@lion.com' } }, { local: { email: 'rox@rouky.com' } }],
      bills: [{ _id: billsIds[0] }],
    }];

    findBillsAndHelpersByCustomerStub.returns(customers);

    billAlertEmailStub
      .onFirstCall()
      .returns(Promise.resolve('leroi@lion.com'))
      .onSecondCall()
      .returns(Promise.reject(error));

    BillMock
      .expects('updateMany')
      .never();


    await billDispatch.method(server);
    expect(billAlertEmailStub.callCount).toBe(2);
    expect(billAlertEmailStub.getCall(0).calledWithExactly('leroi@lion.com'));
    expect(billAlertEmailStub.getCall(1).calledWithExactly('rox@rouky.com'));
    BillMock.verify();
    sinon.assert.calledWith(serverLogStub, ['error', 'cron', 'jobs'], error);
    sinon.assert.calledWith(billDispatchOnCompleteStub, server, [], ['leroi@lion.com', 'rox@rouky.com']);
    serverLogStub.restore();
  });
});
