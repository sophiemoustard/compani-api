const expect = require('expect');
const _ = require('lodash');

const { canBeWithdrawn } = require('../../../helpers/balances');

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
