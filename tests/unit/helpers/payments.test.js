const sinon = require('sinon');
const Boom = require('boom');
const expect = require('expect');
const moment = require('moment');
const { ObjectID } = require('mongodb');

const omit = require('lodash/omit');
const PaymentsHelper = require('../../../src/helpers/payments');
const UtilsHelper = require('../../../src/helpers/utils');
const { PAYMENT, REFUND } = require('../../../src/helpers/constants');
const PaymentNumber = require('../../../src/models/PaymentNumber');
const Payment = require('../../../src/models/Payment');
const xmlHelper = require('../../../src/helpers/xml');

require('sinon-mongoose');

describe('list', () => {
  let getDateQueryStub;
  let PaymentModel;
  beforeEach(() => {
    getDateQueryStub = sinon.stub(UtilsHelper, 'getDateQuery');
    PaymentModel = sinon.mock(Payment);
  });

  afterEach(() => {
    getDateQueryStub.restore();
    PaymentModel.restore();
  });

  it('should return all payments ', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = {};
    const payment = { _id: new ObjectID() };
    PaymentModel
      .expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .withExactArgs({ path: 'client', select: '_id name' })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: '_id identity' })
      .chain('lean')
      .returns([payment]);

    const result = await PaymentsHelper.list(query, credentials);

    expect(result).toEqual([payment]);
    sinon.assert.notCalled(getDateQueryStub);
  });

  it('should call getDateQuery if startDate is defined ', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { startDate: '2019-11-01' };
    const payment = { _id: new ObjectID() };

    getDateQueryStub.returns({ $lte: '2019-11-01' });

    PaymentModel
      .expects('find')
      .withExactArgs({ company: credentials.company._id, date: { $lte: '2019-11-01' } })
      .chain('populate')
      .withExactArgs({ path: 'client', select: '_id name' })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: '_id identity' })
      .chain('lean')
      .returns([payment]);

    const result = await PaymentsHelper.list(query, credentials);

    expect(result).toEqual([payment]);
    sinon.assert.calledWithExactly(getDateQueryStub, { startDate: query.startDate, endDate: query.endDate });
  });

  it('should call getDateQuery if endDate is defined ', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { endDate: '2019-11-01' };
    const payment = { _id: new ObjectID() };

    getDateQueryStub.returns({ $gte: '2019-11-01' });

    PaymentModel
      .expects('find')
      .withExactArgs({ company: credentials.company._id, date: { $gte: '2019-11-01' } })
      .chain('populate')
      .withExactArgs({ path: 'client', select: '_id name' })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: '_id identity' })
      .chain('lean')
      .returns([payment]);

    const result = await PaymentsHelper.list(query, credentials);

    expect(result).toEqual([payment]);
    sinon.assert.calledWithExactly(getDateQueryStub, { startDate: query.startDate, endDate: query.endDate });
  });
});

describe('generatePaymentNumber', () => {
  const paymentNatures = [
    { type: PAYMENT, returned: { prefix: 'REG-1904', seq: '1' }, result: 'REG-1904001' },
    { type: REFUND, returned: { prefix: 'REMB-1904', seq: '1' }, result: 'REMB-1904001' },
  ];
  paymentNatures.forEach((nature) => {
    it(`should return right payment number if nature is '${nature.type}' `, async () => {
      const findOneAndUpdate = sinon.stub(PaymentNumber, 'findOneAndUpdate').returns(nature.returned);
      const result = await PaymentsHelper.generatePaymentNumber(nature.type);
      findOneAndUpdate.restore();

      expect(result).toBeDefined();
      expect(result).toBe(nature.result);
    });
  });
});

describe('generateXML', () => {
  const company = {
    _id: new ObjectID(),
    name: 'test',
    iban: '1234',
    bic: '5678',
    ics: '9876',
    directDebitsFolderId: '1234567890',
  };
  const firstPayments = [{
    company: company._id,
    date: '2019-11-20',
    customer: new ObjectID(),
    client: new ObjectID(),
    netInclTaxes: 190,
    nature: PAYMENT,
    type: 'direct_debit',
  }];
  const recurPayments = [{
    company: company._id,
    date: '2019-11-20',
    customer: new ObjectID(),
    client: new ObjectID(),
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

    sinon.assert.calledOnce(createDocumentStub);
    sinon.assert.calledWithExactly(createDocumentStub);
    sinon.assert.calledOnce(generateSEPAHeaderStub);
    sinon.assert.calledWith(generateSEPAHeaderStub, { ...generateSEPAHeaderArgument, txNumber: 0, sum: 0 });
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

    sinon.assert.calledOnce(createDocumentStub);
    sinon.assert.calledWithExactly(createDocumentStub);
    sinon.assert.calledOnce(generateSEPAHeaderStub);
    sinon.assert.calledWith(generateSEPAHeaderStub, { ...generateSEPAHeaderArgument, txNumber: 1, sum: 190 });

    sinon.assert.calledOnce(generatePaymentInfoStub);
    sinon.assert.calledWithExactly(generatePaymentInfoStub, generateFirstPaymentsInfoArgument);
    sinon.assert.calledOnce(addTransactionInfoStub);
    sinon.assert.calledWithExactly(addTransactionInfoStub, firstPaymentsInfo, firstPayments);
    sinon.assert.calledOnce(generateSEPAXmlStub);
  });

  it('should deal with recurPayments if recurPayments has payments', async () => {
    createDocumentStub.returns(document);
    generateSEPAHeaderStub.returns(SEPAHeader);
    generatePaymentInfoStub.returns(recurPaymentsInfo);
    addTransactionInfoStub.returns(recurPaymentsInfo);
    generateSEPAXmlStub.returns();

    await PaymentsHelper.generateXML([], recurPayments, company);

    sinon.assert.calledOnce(createDocumentStub);
    sinon.assert.calledWithExactly(createDocumentStub);
    sinon.assert.calledOnce(generateSEPAHeaderStub);
    sinon.assert.calledWith(generateSEPAHeaderStub, { ...generateSEPAHeaderArgument, txNumber: 1, sum: 120 });

    sinon.assert.calledOnce(generatePaymentInfoStub);
    sinon.assert.calledWithExactly(generatePaymentInfoStub, generateRecurPaymentsInfoArgument);
    sinon.assert.calledOnce(addTransactionInfoStub);
    sinon.assert.calledWithExactly(addTransactionInfoStub, recurPaymentsInfo, recurPayments);

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

    sinon.assert.calledOnce(createDocumentStub);
    sinon.assert.calledWithExactly(createDocumentStub);
    sinon.assert.calledOnce(generateSEPAHeaderStub);
    sinon.assert.calledWith(generateSEPAHeaderStub, generateSEPAHeaderArgument);

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
  it('should create a payment', async () => {
    const payment = {
      date: '2019-11-28',
      customer: new ObjectID(),
      client: new ObjectID(),
      netInclTaxes: 190,
      nature: PAYMENT,
      type: 'direct_debit',
    };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const formatPaymentStub = sinon.stub(PaymentsHelper, 'formatPayment').returns(payment);
    const saveStub = sinon.stub(Payment.prototype, 'save');

    const result = await PaymentsHelper.createPayment(payment, credentials);

    expect(result).toBeDefined();
    sinon.assert.calledWithExactly(formatPaymentStub, payment, credentials.company);
    sinon.assert.calledOnce(formatPaymentStub);
    sinon.assert.calledOnce(saveStub);

    formatPaymentStub.restore();
    saveStub.restore();
  });
});

describe('formatPayment', () => {
  it('should add an id, a number and a company to payment', async () => {
    const payment = {
      date: moment().toDate(),
      customer: new ObjectID(),
      client: new ObjectID(),
      netInclTaxes: 190,
      nature: PAYMENT,
      type: 'direct_debit',
    };
    const companyId = new ObjectID();
    const company = { _id: companyId };
    const generatePaymentNumberStub = sinon.stub(PaymentsHelper, 'generatePaymentNumber').returns('REG-1904001');
    const result = await PaymentsHelper.formatPayment(payment, company);
    generatePaymentNumberStub.restore();

    expect(result).toBeDefined();
    expect(result.number).toBe('REG-1904001');
    expect(ObjectID.isValid(result._id)).toBe(true);
    expect(result.company).toBe(companyId);
  });
});

describe('savePayments', () => {
  let formatPaymentStub;
  let generateXMLStub;
  let saveStub;
  let PaymentModel;
  beforeEach(() => {
    formatPaymentStub = sinon.stub(PaymentsHelper, 'formatPayment');
    generateXMLStub = sinon.stub(PaymentsHelper, 'generateXML');
    saveStub = sinon.stub(Payment.prototype, 'save');
    PaymentModel = sinon.mock(Payment);
  });

  afterEach(() => {
    formatPaymentStub.restore();
    generateXMLStub.restore();
    saveStub.restore();
    PaymentModel.restore();
  });
  const credentials = {
    company: {
      _id: new ObjectID(),
      name: 'test',
      iban: '1234',
      bic: '5678',
      ics: '9876',
      directDebitsFolderId: '1234567890',
    },
  };
  const payload = [{
    company: credentials.company._id,
    date: '2019-11-20',
    customer: new ObjectID(),
    client: new ObjectID(),
    netInclTaxes: 190,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    company: credentials.company._id,
    date: '2019-11-20',
    customer: new ObjectID(),
    client: new ObjectID(),
    netInclTaxes: 120,
    nature: PAYMENT,
    type: 'direct_debit',
  }];

  it('should return error if company is missing', async () => {
    try {
      const credentialsTmp = {};
      await PaymentsHelper.savePayments(payload, credentialsTmp);
      sinon.assert.notCalled(formatPaymentStub);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Missing mandatory company info !'));
    }
  });

  const params = ['name', 'iban', 'bic', 'ics', 'directDebitsFolderId'];
  params.forEach((param) => {
    it(`should return error if missing '${param}' `, async () => {
      try {
        await PaymentsHelper.savePayments(payload, omit(credentials, `company.${param}`));
        sinon.assert.notCalled(formatPaymentStub);
      } catch (e) {
        expect(e).toEqual(Boom.badRequest('Missing mandatory company info !'));
      }
    });
  });

  it('should save payments', async () => {
    PaymentModel.expects('countDocuments').onCall(0).returns(0);
    PaymentModel.expects('countDocuments').onCall(1).returns(1);
    formatPaymentStub.onCall(0).returns(payload[0]);
    formatPaymentStub.onCall(1).returns(payload[1]);
    generateXMLStub.returns('');

    await PaymentsHelper.savePayments(payload, credentials);
    sinon.assert.calledTwice(formatPaymentStub);
    sinon.assert.calledTwice(saveStub);
    sinon.assert.calledWithExactly(generateXMLStub, [payload[0]], [payload[1]], credentials.company);
    sinon.assert.calledOnce(generateXMLStub);
  });
});

describe('exportPaymentsHistory', () => {
  const header = ['Nature', 'Identifiant', 'Date', 'Id Bénéficiaire', 'Titre', 'Nom', 'Prénom', 'Id tiers payeur', 'Tiers payeur', 'Moyen de paiement', 'Montant TTC en €'];
  const paymentsList = [
    {
      number: 'REG-1905562',
      type: 'bank_transfer',
      nature: 'payment',
      date: '2019-05-20T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a4fb00997363eb3'),
        identity: {
          title: 'mrs',
          firstname: 'Mimi',
          lastname: 'Mathy',
        },
      },
      client: { _id: ObjectID('5c35b5eb7e0fb87297363eb2'), name: 'TF1' },
      netInclTaxes: 389276.023,
    }, {
      number: 'REG-1905342',
      type: 'direct_debit',
      nature: 'refund',
      date: '2019-05-22T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a6fb02397363eb1'),
        identity: {
          title: 'mr',
          firstname: 'Bojack',
          lastname: 'Horseman',
        },
      },
      client: { _id: ObjectID('5c35b5eb1a6fb87297363eb2'), name: 'The Sherif' },
      netInclTaxes: 1002.4,
    },
  ];
  let mockPayment;

  beforeEach(() => {
    mockPayment = sinon.mock(Payment);
  });

  afterEach(() => {
    mockPayment.restore();
  });

  it('should return an array containing just the header', async () => {
    mockPayment.expects('find')
      .chain('sort')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);
    const credentials = { company: new ObjectID() };
    const exportArray = await PaymentsHelper.exportPaymentsHistory(null, null, credentials);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    mockPayment.expects('find')
      .chain('sort')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(paymentsList);
    const credentials = { company: new ObjectID() };
    const exportArray = await PaymentsHelper.exportPaymentsHistory(null, null, credentials);

    expect(exportArray).toEqual([
      header,
      ['Paiement', 'REG-1905562', '20/05/2019', '5c35b5eb1a4fb00997363eb3', 'Mme', 'MATHY', 'Mimi', '5c35b5eb7e0fb87297363eb2', 'TF1', 'Virement', '389276,02'],
      ['Remboursement', 'REG-1905342', '22/05/2019', '5c35b5eb1a6fb02397363eb1', 'M.', 'HORSEMAN', 'Bojack', '5c35b5eb1a6fb87297363eb2', 'The Sherif', 'Prélèvement', '1002,40'],
    ]);
  });
});
