const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const { ObjectID } = require('mongodb');

const payments = require('../../../helpers/payments');
const { PAYMENT, REFUND, PAYMENT_TYPES } = require('../../../helpers/constants');
const PaymentNumber = require('../../../models/PaymentNumber');

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
