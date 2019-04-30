const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const _ = require('lodash');

const {
  canBeWithdrawn,
  getBalance,
  computePayments,
  computeTotal
} = require('../../../helpers/balances');

describe('canBeWithdrawn', () => {
  const bill = {
    _id: {
      tpp: null,
      customer: '5c75019d4448ad001428dbed'
    },
    billed: 100,
    customer: {
      _id: '5c75019d4448ad001428dbed',
      identity: {
        title: 'M.',
        lastname: 'Boetie',
        firstname: 'Jean-Marc',
        birthDate: '1931-02-02T00:00:00.000Z'
      },
      payment: {
        mandates: [
          {
            _id: '5c75019d4448ad001428dbee',
            rum: 'R190200020290F6610BF307CEA7F6D',
            createdAt: '2019-02-26T09:06:37.366Z',
            signedAt: '2019-03-07T13:23:56.792Z'
          }
        ],
        iban: 'FR7630066899101763227534345',
        bankAccountOwner: 'Test',
        bic: 'AGFBFRCC'
      }
    },
    paid: 0,
    balance: -100
  };

  it('should check if bill can be withdrawn', () => {
    expect(canBeWithdrawn(bill)).toBe(true);
  });

  const falsyTests = [
    {
      assertion: 'balance is positive',
      bill: { ...bill, billed: -100, balance: 100 },
    },
    {
      assertion: 'client is a third party payer',
      bill: { ...bill, _id: { customer: '5c75019d4448ad001428dbed', tpp: '5c75019d4448ad001428dbed' } },
    },
    {
      assertion: 'client has no payment field',
      bill: _.cloneDeep(bill),
      update() {
        delete this.bill.customer.payment;
      },
    },
    {
      assertion: 'client has no mandates',
      bill: _.cloneDeep(bill),
      update() {
        this.bill.customer.payment.mandates = [];
      },
    },
    {
      assertion: 'client has no signed mandate',
      bill: _.cloneDeep(bill),
      update() {
        delete this.bill.customer.payment.mandates[0].signedAt;
      },
    },
  ];

  falsyTests.forEach((test) => {
    it(`should return false if ${test.assertion}`, () => {
      if (test.update) test.update();
      expect(canBeWithdrawn(test.bill)).toBe(false);
    });
  });
});

describe('getBalance', () => {
  it('should format balance for customer without credit notes and payment', () => {
    const customerId = new ObjectID();
    const bill = {
      _id: { customer: customerId },
      billed: 70,
      customer: {
        payment: {
          mandates: [{ _id: new ObjectID(), createdAt: moment().toISOString(), signedAt: moment().toISOString() }],
        },
      }
    };

    const result = getBalance(bill, [], [], []);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(70);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-70);
    expect(result.toPay).toEqual(70);
  });

  it('should format balance for customer with credit notes and without payment', () => {
    const customerId = new ObjectID();
    const bill = {
      _id: { customer: customerId },
      billed: 70,
      customer: {
        payment: {
          mandates: [{ _id: new ObjectID(), createdAt: moment().toISOString(), signedAt: moment().toISOString() }],
        },
      }
    };
    const customerCreditNotes = [
      { _id: { customer: customerId }, customer: { _id: customerId }, refund: 50 },
      { _id: { customer: new ObjectID() }, refund: 90 },
    ];

    const result = getBalance(bill, customerCreditNotes, [], []);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(20);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-20);
    expect(result.toPay).toEqual(20);
  });

  it('should format balance for customer with credit notes and payments', () => {
    const customerId = new ObjectID();
    const bill = {
      _id: { customer: customerId },
      billed: 70,
      customer: {
        payment: {
          mandates: [{ _id: new ObjectID(), createdAt: moment().toISOString(), signedAt: moment().toISOString() }],
        },
      }
    };
    const customerCreditNotes = [
      { _id: { customer: customerId }, customer: { _id: customerId }, refund: 50 },
      { _id: { customer: new ObjectID() }, refund: 90 },
    ];
    const payments = [
      { _id: { customer: customerId }, payments: [{ nature: 'payment', netInclTaxes: 80 }, { nature: 'payment', netInclTaxes: 30 }] },
      { _id: { customer: new ObjectID() }, payments: [{ nature: 'payment', netInclTaxes: 50 }] },
    ];

    const result = getBalance(bill, customerCreditNotes, [], payments);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(20);
    expect(result.paid).toEqual(110);
    expect(result.balance).toEqual(90);
    expect(result.toPay).toEqual(0);
  });

  it('should format balance for tpp with credit notes and without payment', () => {
    const customerId = new ObjectID();
    const tppId = new ObjectID();
    const bill = {
      _id: { customer: customerId, tpp: tppId },
      billed: 70,
    };
    const tppCreditNotes = [
      { _id: { customer: customerId, tpp: tppId }, refund: 40, customer: customerId },
      { _id: { customer: new ObjectID(), tpp: tppId }, refund: 40 },
      { _id: { customer: customerId, tpp: new ObjectID() }, refund: 50 },
    ];

    const result = getBalance(bill, [], tppCreditNotes, []);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(30);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-30);
    expect(result.toPay).toEqual(0);
  });

  it('should format balance for tpp with credit notes and payments', () => {
    const customerId = new ObjectID();
    const tppId = new ObjectID();
    const bill = {
      _id: { customer: customerId, tpp: tppId },
      billed: 70,
    };
    const tppCreditNotes = [
      { _id: { customer: customerId, tpp: tppId }, refund: 40 },
      { _id: { customer: customerId, tpp: new ObjectID() }, refund: 50, },
      { _id: { customer: new ObjectID(), tpp: tppId }, refund: 50 },
    ];
    const payments = [
      { _id: { customer: customerId, tpp: tppId }, payments: [{ nature: 'refund', netInclTaxes: 80 }, { nature: 'payment', netInclTaxes: 30 }] },
      { _id: { customer: customerId, tpp: tppId }, payments: [{ nature: 'payment', netInclTaxes: 50 }] },
    ];

    const result = getBalance(bill, [], tppCreditNotes, payments);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(30);
    expect(result.paid).toEqual(-50);
    expect(result.balance).toEqual(-80);
    expect(result.toPay).toEqual(0);
  });
});

describe('computePayments', () => {
  it('should return 0 as payment is undefined', () => {
    expect(computePayments()).toEqual(0);
  });

  it('should return 0 as payment is not an array', () => {
    expect(computePayments({})).toEqual(0);
  });

  it('should return 0 as payment is empty', () => {
    expect(computePayments([])).toEqual(0);
  });

  it('should compute payments for customer', () => {
    const customerId = new ObjectID();
    const ids = { customer: customerId };
    const payments = [{ netInclTaxes: 14, nature: 'payment' }, { netInclTaxes: 12, nature: 'refund' }, { netInclTaxes: 23, nature: 'payment' }];

    expect(computePayments(payments, ids)).toEqual(25);
  });
});

describe('computeTotal', () => {
  it('should compute total with payment', () => {
    expect(computeTotal('payment', 100, 50)).toEqual(150);
  });

  it('should compute total without payment', () => {
    expect(computeTotal('toto', 100, 50)).toEqual(50);
  });
});
