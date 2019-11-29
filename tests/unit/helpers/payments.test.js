const sinon = require('sinon');
const Boom = require('boom');
const expect = require('expect');
const moment = require('moment');
const { ObjectID } = require('mongodb');

const omit = require('lodash/omit');
const PaymentsHelper = require('../../../src/helpers/payments');
const { PAYMENT, REFUND } = require('../../../src/helpers/constants');
const PaymentNumber = require('../../../src/models/PaymentNumber');
const Payment = require('../../../src/models/Payment');

require('sinon-mongoose');

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
    sinon.assert.calledWithExactly(formatPaymentStub, payment, credentials);
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
    const credentials = { company: { _id: companyId } };
    const generatePaymentNumberStub = sinon.stub(PaymentsHelper, 'generatePaymentNumber').returns('REG-1904001');
    const result = await PaymentsHelper.formatPayment(payment, credentials);
    generatePaymentNumberStub.restore();

    expect(result).toBeDefined();
    expect(payment.number).toBe('REG-1904001');
    expect(ObjectID.isValid(payment._id)).toBe(true);
    expect(payment.company).toBe(credentials.company._id);
  });
});

describe('savePayment', () => {
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
