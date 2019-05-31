const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const { ObjectID } = require('mongodb');

const payments = require('../../../helpers/payments');
const { PAYMENT, REFUND, PAYMENT_TYPES } = require('../../../helpers/constants');
const PaymentNumber = require('../../../models/PaymentNumber');
const Payment = require('../../../models/Payment');

require('sinon-mongoose');

describe('generatePaymentNumber', () => {
  const paymentNatures = [
    { type: PAYMENT, returned: { prefix: 'REG-1904', seq: '1' }, result: 'REG-1904001' },
    { type: REFUND, returned: { prefix: 'REMB-1904', seq: '1' }, result: 'REMB-1904001' },
  ];
  paymentNatures.forEach((nature) => {
    it(`should return right payment number if nature is '${nature.type}' `, async () => {
      const findOneAndUpdate = sinon.stub(PaymentNumber, 'findOneAndUpdate').returns(nature.returned);
      const result = await payments.generatePaymentNumber(nature.type);
      findOneAndUpdate.restore();

      expect(result).toBeDefined();
      expect(result).toBe(nature.result);
    });
  });
});

describe('formatPayment', () => {
  it('should add an id and a number to payment', async () => {
    const payment = {
      date: moment().toDate(),
      customer: new ObjectID(),
      client: new ObjectID(),
      netInclTaxes: 190,
      nature: PAYMENT,
      type: PAYMENT_TYPES[0],
    };
    const generatePaymentNumberStub = sinon.stub(payments, 'generatePaymentNumber').returns('REG-1904001');
    const result = await payments.formatPayment(payment);
    generatePaymentNumberStub.restore();

    expect(result).toBeDefined();
    expect(payment.number).toBe('REG-1904001');
    expect(ObjectID.isValid(payment._id)).toBe(true);
  });
});

describe('exportPaymentsHistory', () => {
  const header = ['Identifiant', 'Date', 'Bénéficiaire', 'Tiers Payeur', 'Moyen de paiement', 'Montant en € TTC'];
  const bills = [
    {
      number: 'REG-1905562',
      type: 'bank_transfer',
      date: '2019-05-20T06:00:00.000+00:00',
      customer: {
        identity: {
          title: 'Mme',
          firstname: 'Mimi',
          lastname: 'Mathy',
        },
      },
      client: { name: 'TF1' },
      netInclTaxes: 389276.023,
    }, {
      number: 'REG-1905342',
      type: 'withdrawal',
      date: '2019-05-22T06:00:00.000+00:00',
      customer: {
        identity: {
          title: 'M',
          firstname: 'Bojack',
          lastname: 'Horseman',
        },
      },
      client: { name: 'The Sherif' },
      netInclTaxes: 1002.4,
    }
  ];
  let expectsFind;
  let mockPayment;

  beforeEach(() => {
    mockPayment = sinon.mock(Payment);
    expectsFind = mockPayment.expects('find')
      .chain('sort')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once();
  });

  afterEach(() => {
    mockPayment.restore();
  });

  it('should return an array containing just the header', async () => {
    expectsFind.resolves([]);
    const exportArray = await payments.exportPaymentsHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    expectsFind.resolves(bills);
    const exportArray = await payments.exportPaymentsHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['', '20/05/2019', 'Mme Mimi MATHY', 'TF1', 'Virement', '389276.02'],
      ['', '22/05/2019', 'M Bojack HORSEMAN', 'The Sherif', 'Retrait', '1002.40'],
    ]);
  });
});
