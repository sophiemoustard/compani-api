const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
require('sinon-mongoose');

const Bill = require('../../../models/Bill');
const BillRepository = require('../../../repositories/BillRepository');
const EmailHelper = require('../../../helpers/email');
const invoiceDispatch = require('../../../jobs/invoiceDispatch');


describe('method', () => {
  let BillMock;
  let findHelpersFromCustomerBillStub;
  let invoiceAlertEmailStub;
  let completeInvoiceScriptEmailStub;
  let invoiceDispatchOnCompleteStub;
  let date;
  const fakeDate = new Date('2019-01-03');

  beforeEach(() => {
    BillMock = sinon.mock(Bill);
    findHelpersFromCustomerBillStub = sinon.stub(BillRepository, 'findHelpersFromCustomerBill');
    invoiceAlertEmailStub = sinon.stub(EmailHelper, 'invoiceAlertEmail');
    completeInvoiceScriptEmailStub = sinon.stub(EmailHelper, 'completeInvoiceScriptEmail');
    invoiceDispatchOnCompleteStub = sinon.stub(invoiceDispatch, 'onComplete');
    date = sinon.useFakeTimers(fakeDate.getTime());
  });

  afterEach(() => {
    BillMock.restore();
    findHelpersFromCustomerBillStub.restore();
    invoiceAlertEmailStub.restore();
    completeInvoiceScriptEmailStub.restore();
    invoiceDispatchOnCompleteStub.restore();
    date.restore();
  });

  it('should email an invoice to customers helpers', async () => {
    const server = 'server';
    const billsIds = [new ObjectID()];
    const customers = [{
      helpers: [{ local: { email: 'leroi@lion.com' } }, { local: { email: 'rox@rouky.com' } }],
      bills: [{ _id: billsIds[0] }],
    }];

    findHelpersFromCustomerBillStub.returns(customers);

    invoiceAlertEmailStub
      .onFirstCall()
      .returns(new Promise(resolve => resolve('leroi@lion.com')))
      .onSecondCall()
      .returns(new Promise(resolve => resolve('rox@rouky.com')));

    BillMock
      .expects('updateMany')
      .withArgs({ _id: { $in: billsIds } }, { $set: { sent: fakeDate } })
      .once();

    await invoiceDispatch.method(server);
    expect(invoiceAlertEmailStub.callCount).toBe(2);
    expect(invoiceAlertEmailStub.getCall(0).calledWithExactly('leroi@lion.com'));
    expect(invoiceAlertEmailStub.getCall(1).calledWithExactly('rox@rouky.com'));
    BillMock.verify();
    sinon.assert.calledWith(invoiceDispatchOnCompleteStub, server, ['leroi@lion.com', 'rox@rouky.com'], []);
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

    findHelpersFromCustomerBillStub.returns(customers);

    invoiceAlertEmailStub
      .onFirstCall()
      .returns(new Promise(resolve => resolve('leroi@lion.com')))
      .onSecondCall()
      .returns(Promise.reject(error));

    BillMock
      .expects('updateMany')
      .never();


    await invoiceDispatch.method(server);
    expect(invoiceAlertEmailStub.callCount).toBe(2);
    expect(invoiceAlertEmailStub.getCall(0).calledWithExactly('leroi@lion.com'));
    expect(invoiceAlertEmailStub.getCall(1).calledWithExactly('rox@rouky.com'));
    BillMock.verify();
    sinon.assert.calledWith(serverLogStub, ['error', 'cron', 'jobs'], error);
    sinon.assert.calledWith(invoiceDispatchOnCompleteStub, server, [], ['leroi@lion.com', 'rox@rouky.com']);
    serverLogStub.restore();
  });
});
