const sinon = require('sinon');
const Boom = require('@hapi/boom');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const omit = require('lodash/omit');
const PaymentsHelper = require('../../../src/helpers/payments');
const UtilsHelper = require('../../../src/helpers/utils');
const { PAYMENT, REFUND } = require('../../../src/helpers/constants');
const PaymentNumber = require('../../../src/models/PaymentNumber');
const Payment = require('../../../src/models/Payment');
const xmlHelper = require('../../../src/helpers/xml');
const SinonMongoose = require('../sinonMongoose');

describe('getPayments', () => {
  let getDateQueryStub;
  let find;
  beforeEach(() => {
    getDateQueryStub = sinon.stub(UtilsHelper, 'getDateQuery');
    find = sinon.stub(Payment, 'find');
  });

  afterEach(() => {
    getDateQueryStub.restore();
    find.restore();
  });

  it('should return all payments ', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const query = {};
    const payment = { _id: new ObjectId() };
    find.returns(SinonMongoose.stubChainedQueries([payment]));

    const result = await PaymentsHelper.getPayments(query, credentials);

    expect(result).toEqual([payment]);
    sinon.assert.notCalled(getDateQueryStub);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ company: credentials.company._id }] },
        { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name' }] },
        { query: 'populate', args: [{ path: 'customer', select: '_id identity' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should call getDateQuery if startDate is defined ', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const query = { startDate: '2019-11-01' };
    const payment = { _id: new ObjectId() };

    getDateQueryStub.returns({ $lte: '2019-11-01' });
    find.returns(SinonMongoose.stubChainedQueries([payment]));

    const result = await PaymentsHelper.getPayments(query, credentials);

    expect(result).toEqual([payment]);
    sinon.assert.calledOnceWithExactly(getDateQueryStub, { startDate: query.startDate, endDate: query.endDate });
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ company: credentials.company._id, date: { $lte: '2019-11-01' } }] },
        { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name' }] },
        { query: 'populate', args: [{ path: 'customer', select: '_id identity' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should call getDateQuery if endDate is defined ', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const query = { endDate: '2019-11-01' };
    const payment = { _id: new ObjectId() };

    getDateQueryStub.returns({ $gte: '2019-11-01' });
    find.returns(SinonMongoose.stubChainedQueries([payment]));

    const result = await PaymentsHelper.getPayments(query, credentials);

    expect(result).toEqual([payment]);
    sinon.assert.calledOnceWithExactly(getDateQueryStub, { startDate: query.startDate, endDate: query.endDate });
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ company: credentials.company._id, date: { $gte: '2019-11-01' } }] },
        { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name' }] },
        { query: 'populate', args: [{ path: 'customer', select: '_id identity' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('generateXML', () => {
  const company = {
    _id: new ObjectId(),
    name: 'test',
    iban: '1234',
    bic: '5678',
    ics: '9876',
    directDebitsFolderId: '1234567890',
  };
  const firstPayments = [{
    company: company._id,
    date: '2019-11-20',
    customer: new ObjectId(),
    thirdPartyPayer: new ObjectId(),
    netInclTaxes: 190,
    nature: PAYMENT,
    type: 'direct_debit',
  }];
  const recurPayments = [{
    company: company._id,
    date: '2019-11-20',
    customer: new ObjectId(),
    thirdPartyPayer: new ObjectId(),
    netInclTaxes: 120,
    nature: PAYMENT,
    type: 'direct_debit',
  }];

  let date;
  const fakeDate = new Date('2019-01-03');

  const firstPaymentsInfo = { test: 'test' };

  const recurPaymentsInfo = { test2: 'test2' };

  const generateSEPAHeaderArgument = {
    id: sinon.match.string,
    created: fakeDate,
    initiatorName: company.name.split(' ')[0],
    txNumber: firstPayments.length + recurPayments.length,
    sum: 310,
    ics: company.ics,
  };

  const document = { Document: { '@xlns': '123456' } };

  const SEPAHeader = { header1: '1234', header2: '5678' };

  const generateFirstPaymentsInfoArgument = {
    id: sinon.match.string,
    sequenceType: 'FRST',
    method: 'DD',
    txNumber: firstPayments.length,
    sum: 190,
    collectionDate: fakeDate,
    creditor: {
      name: company.name.split(' ')[0],
      iban: company.iban,
      bic: company.bic,
      ics: company.ics,
    },
  };

  const generateRecurPaymentsInfoArgument = {
    id: sinon.match.string,
    sequenceType: 'RCUR',
    method: 'DD',
    txNumber: recurPayments.length,
    sum: 120,
    collectionDate: fakeDate,
    creditor: {
      name: company.name.split(' ')[0],
      iban: company.iban,
      bic: company.bic,
      ics: company.ics,
    },
  };

  let generateSEPAHeaderStub;
  let createDocumentStub;
  let generatePaymentInfoStub;
  let addTransactionInfoStub;
  let generateSEPAXmlStub;
  beforeEach(() => {
    generateSEPAHeaderStub = sinon.stub(xmlHelper, 'generateSEPAHeader');
    createDocumentStub = sinon.stub(xmlHelper, 'createDocument');
    generatePaymentInfoStub = sinon.stub(xmlHelper, 'generatePaymentInfo');
    addTransactionInfoStub = sinon.stub(xmlHelper, 'addTransactionInfo');
    generateSEPAXmlStub = sinon.stub(xmlHelper, 'generateSEPAXml');
    date = sinon.useFakeTimers(fakeDate.getTime());
  });

  afterEach(() => {
    generateSEPAHeaderStub.restore();
    createDocumentStub.restore();
    generatePaymentInfoStub.restore();
    addTransactionInfoStub.restore();
    generateSEPAXmlStub.restore();
    date.restore();
  });

  it('should not deal with firstPayments or recurPayments if neither has payment', async () => {
    createDocumentStub.returns(document);
    generateSEPAHeaderStub.returns(SEPAHeader);
    generateSEPAXmlStub.returns();

    await PaymentsHelper.generateXML([], [], company);

    sinon.assert.calledOnceWithExactly(createDocumentStub);
    sinon.assert.calledOnceWithExactly(generateSEPAHeaderStub, { ...generateSEPAHeaderArgument, txNumber: 0, sum: 0 });
    sinon.assert.calledOnce(generateSEPAXmlStub);
    sinon.assert.notCalled(generatePaymentInfoStub);
    sinon.assert.notCalled(addTransactionInfoStub);
  });

  it('should deal with firstPayments if firstPayments has payment', async () => {
    createDocumentStub.returns(document);
    generateSEPAHeaderStub.returns(SEPAHeader);
    generatePaymentInfoStub.returns(firstPaymentsInfo);
    addTransactionInfoStub.returns(firstPaymentsInfo);
    generateSEPAXmlStub.returns();

    await PaymentsHelper.generateXML(firstPayments, [], company);

    sinon.assert.calledOnceWithExactly(createDocumentStub);
    sinon.assert.calledOnceWithExactly(
      generateSEPAHeaderStub,
      { ...generateSEPAHeaderArgument, txNumber: 1, sum: 190 }
    );
    sinon.assert.calledOnceWithExactly(generatePaymentInfoStub, generateFirstPaymentsInfoArgument);
    sinon.assert.calledOnceWithExactly(addTransactionInfoStub, firstPaymentsInfo, firstPayments);
    sinon.assert.calledOnce(generateSEPAXmlStub);
  });

  it('should deal with recurPayments if recurPayments has payments', async () => {
    createDocumentStub.returns(document);
    generateSEPAHeaderStub.returns(SEPAHeader);
    generatePaymentInfoStub.returns(recurPaymentsInfo);
    addTransactionInfoStub.returns(recurPaymentsInfo);
    generateSEPAXmlStub.returns();

    await PaymentsHelper.generateXML([], recurPayments, company);

    sinon.assert.calledOnceWithExactly(createDocumentStub);
    sinon.assert.calledOnceWithExactly(
      generateSEPAHeaderStub,
      { ...generateSEPAHeaderArgument, txNumber: 1, sum: 120 }
    );
    sinon.assert.calledOnceWithExactly(generatePaymentInfoStub, generateRecurPaymentsInfoArgument);
    sinon.assert.calledOnceWithExactly(addTransactionInfoStub, recurPaymentsInfo, recurPayments);
    sinon.assert.calledOnce(generateSEPAXmlStub);
  });

  it('should deal with both firstPayments and recurPayments if both have payments', async () => {
    createDocumentStub.returns(document);
    generateSEPAHeaderStub.returns(SEPAHeader);
    generatePaymentInfoStub.onCall(0).returns(firstPaymentsInfo);
    addTransactionInfoStub.onCall(0).returns(firstPaymentsInfo);
    generatePaymentInfoStub.onCall(1).returns(recurPaymentsInfo);
    addTransactionInfoStub.onCall(1).returns(recurPaymentsInfo);

    generateSEPAXmlStub.returns();

    await PaymentsHelper.generateXML(firstPayments, recurPayments, company);

    sinon.assert.calledOnceWithExactly(createDocumentStub);
    sinon.assert.calledOnceWithExactly(generateSEPAHeaderStub, generateSEPAHeaderArgument);

    sinon.assert.calledTwice(generatePaymentInfoStub);
    sinon.assert.calledWithExactly(generatePaymentInfoStub, generateFirstPaymentsInfoArgument);
    sinon.assert.calledWithExactly(generatePaymentInfoStub, generateRecurPaymentsInfoArgument);

    sinon.assert.calledTwice(addTransactionInfoStub);
    sinon.assert.calledWithExactly(addTransactionInfoStub, firstPaymentsInfo, firstPayments);
    sinon.assert.calledWithExactly(addTransactionInfoStub, firstPaymentsInfo, firstPayments);

    sinon.assert.calledOnce(generateSEPAXmlStub);
  });
});

describe('createPayment', () => {
  let create;
  let updateOne;
  let getPaymentNumberStub;
  let formatPaymentStub;

  beforeEach(() => {
    create = sinon.stub(Payment, 'create');
    updateOne = sinon.stub(PaymentNumber, 'updateOne');
    getPaymentNumberStub = sinon.stub(PaymentsHelper, 'getPaymentNumber');
    formatPaymentStub = sinon.stub(PaymentsHelper, 'formatPayment');
  });

  afterEach(() => {
    create.restore();
    updateOne.restore();
    getPaymentNumberStub.restore();
    formatPaymentStub.restore();
  });

  it('should create a payment', async () => {
    const payment = {
      date: '2019-11-28',
      customer: new ObjectId(),
      thirdPartyPayer: new ObjectId(),
      netInclTaxes: 190,
      nature: PAYMENT,
      type: 'direct_debit',
    };
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const number = { prefix: '1219', seq: 1, nature: 'payment', company: companyId };
    const formattedPayment = {
      ...payment,
      _id: new ObjectId(),
      number: 'REG-101121900001',
      company: companyId,
    };

    getPaymentNumberStub.returns(number);
    formatPaymentStub.returns(formattedPayment);
    create.returns(formattedPayment);

    const result = await PaymentsHelper.createPayment(payment, credentials);

    expect(result).toEqual(formattedPayment);
    sinon.assert.calledOnceWithExactly(getPaymentNumberStub, payment, credentials.company._id);
    sinon.assert.calledOnceWithExactly(formatPaymentStub, payment, credentials.company, number);
    sinon.assert.calledOnceWithExactly(create, formattedPayment);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { prefix: number.prefix, nature: number.nature, company: companyId },
      { $set: { seq: number.seq + 1 } }
    );
  });
});

describe('formatPayment', () => {
  it('should add an id, a number and a company to payment', async () => {
    const payment = {
      customer: new ObjectId(),
      thirdPartyPayer: new ObjectId(),
      netInclTaxes: 190,
      nature: PAYMENT,
      type: 'direct_debit',
    };
    const companyId = new ObjectId();
    const company = { _id: companyId, prefixNumber: 101 };
    const number = { prefix: '1219', seq: 1 };
    const formatPaymentNumberStub = sinon.stub(PaymentsHelper, 'formatPaymentNumber').returns('REG-190410100001');
    const result = PaymentsHelper.formatPayment(payment, company, number);

    expect(result).toBeDefined();
    expect(result.number).toBe('REG-190410100001');
    expect(ObjectId.isValid(result._id)).toBe(true);
    expect(result.company).toBe(companyId);
    sinon.assert.calledOnceWithExactly(
      formatPaymentNumberStub,
      company.prefixNumber,
      number.prefix,
      number.seq,
      payment.nature
    );
    formatPaymentNumberStub.restore();
  });
});

describe('getPaymentNumber', () => {
  let findOneAndUpdate;

  beforeEach(() => {
    findOneAndUpdate = sinon.stub(PaymentNumber, 'findOneAndUpdate');
  });

  afterEach(() => {
    findOneAndUpdate.restore();
  });

  it('should get payment number', async () => {
    const payment = { nature: 'payment', date: new Date('2019-12-01') };
    const companyId = new ObjectId();

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await PaymentsHelper.getPaymentNumber(payment, companyId);

    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { nature: payment.nature, company: companyId, prefix: '1219' },
            {},
            { new: true, upsert: true, setDefaultsOnInsert: true },
          ],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('formatPaymentNumber', () => {
  it('should return a refund number', () => {
    expect(PaymentsHelper.formatPaymentNumber(101, '1219', 1, 'refund')).toBe('REMB-101121900001');
  });
  it('should return a payment number', () => {
    expect(PaymentsHelper.formatPaymentNumber(102, '1219', 1, 'payment')).toBe('REG-102121900001');
  });
});

describe('savePayments', () => {
  let getPaymentNumberStub;
  let formatPaymentStub;
  let generateXMLStub;
  let insertMany;
  let countDocuments;
  let updateOneStub;
  beforeEach(() => {
    getPaymentNumberStub = sinon.stub(PaymentsHelper, 'getPaymentNumber');
    formatPaymentStub = sinon.stub(PaymentsHelper, 'formatPayment');
    generateXMLStub = sinon.stub(PaymentsHelper, 'generateXML');
    updateOneStub = sinon.stub(PaymentNumber, 'updateOne');
    insertMany = sinon.stub(Payment, 'insertMany');
    countDocuments = sinon.stub(Payment, 'countDocuments');
  });

  afterEach(() => {
    getPaymentNumberStub.restore();
    formatPaymentStub.restore();
    generateXMLStub.restore();
    updateOneStub.restore();
    insertMany.restore();
    countDocuments.restore();
  });
  const credentials = {
    company: {
      _id: new ObjectId(),
      name: 'test',
      iban: '1234',
      bic: '5678',
      ics: '9876',
      directDebitsFolderId: '1234567890',
    },
  };
  const paymentNumbers = [
    { prefix: '1911', seq: 1, nature: 'payment', company: credentials.company._id },
    { prefix: '1911', seq: 1, nature: 'refund', company: credentials.company._id },
  ];
  const payload = [{
    company: credentials.company._id,
    date: '2019-11-20',
    customer: new ObjectId(),
    thirdPartyPayer: new ObjectId(),
    netInclTaxes: 190,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    company: credentials.company._id,
    date: '2019-11-20',
    customer: new ObjectId(),
    thirdPartyPayer: new ObjectId(),
    netInclTaxes: 120,
    nature: REFUND,
    type: 'direct_debit',
  }];

  it('should return error if company is missing', async () => {
    try {
      const credentialsTmp = {};

      await PaymentsHelper.savePayments(payload, credentialsTmp);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Missing mandatory company info !'));
      sinon.assert.notCalled(getPaymentNumberStub);
      sinon.assert.notCalled(formatPaymentStub);
      sinon.assert.notCalled(updateOneStub);
      sinon.assert.notCalled(insertMany);
    }
  });

  const params = ['name', 'iban', 'bic', 'ics', 'directDebitsFolderId'];
  params.forEach((param) => {
    it(`should return error if missing '${param}' `, async () => {
      try {
        await PaymentsHelper.savePayments(payload, omit(credentials, `company.${param}`));
      } catch (e) {
        expect(e).toEqual(Boom.badRequest('Missing mandatory company info !'));
        sinon.assert.notCalled(getPaymentNumberStub);
        sinon.assert.notCalled(formatPaymentStub);
        sinon.assert.notCalled(updateOneStub);
        sinon.assert.notCalled(insertMany);
      }
    });
  });

  it('should save payments', async () => {
    countDocuments.onCall(0).returns(0);
    countDocuments.onCall(1).returns(1);
    getPaymentNumberStub.onCall(0).returns(paymentNumbers[0]);
    getPaymentNumberStub.onCall(1).returns(paymentNumbers[1]);
    formatPaymentStub.onCall(0).returns(payload[0]);
    formatPaymentStub.onCall(1).returns(payload[1]);
    generateXMLStub.returns('');

    await PaymentsHelper.savePayments(payload, credentials);

    sinon.assert.calledTwice(countDocuments);
    sinon.assert.calledOnceWithExactly(insertMany, payload);
    sinon.assert.calledTwice(formatPaymentStub);
    sinon.assert.calledOnceWithExactly(generateXMLStub, [payload[0]], [payload[1]], credentials.company);
    sinon.assert.calledWithExactly(
      getPaymentNumberStub.getCall(0),
      { nature: 'payment', date: sinon.match.date },
      credentials.company._id
    );
    sinon.assert.calledWithExactly(
      getPaymentNumberStub.getCall(1),
      { nature: 'refund', date: sinon.match.date },
      credentials.company._id
    );
    sinon.assert.calledTwice(getPaymentNumberStub);
    sinon.assert.calledWithExactly(
      updateOneStub.getCall(0),
      { prefix: paymentNumbers[0].prefix, nature: PAYMENT, company: credentials.company._id },
      { $set: { seq: 2 } }
    );
    sinon.assert.calledWithExactly(
      updateOneStub.getCall(1),
      { prefix: paymentNumbers[1].prefix, nature: REFUND, company: credentials.company._id },
      { $set: { seq: 2 } }
    );
    sinon.assert.calledTwice(updateOneStub);
  });
});

describe('remove', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(Payment, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should remove a payment', async () => {
    const paymentId = new ObjectId();

    await PaymentsHelper.remove(paymentId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: paymentId });
  });
});
