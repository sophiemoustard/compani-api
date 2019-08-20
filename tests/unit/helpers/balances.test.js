const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const _ = require('lodash');

const BalanceHelper = require('../../../helpers/balances');
const BillRepository = require('../../../repositories/BillRepository');
const CreditNoteRepository = require('../../../repositories/CreditNoteRepository');
const PaymentRepository = require('../../../repositories/PaymentRepository');

describe('canBeDirectDebited', () => {
  const bill = {
    _id: {
      tpp: null,
      customer: '5c75019d4448ad001428dbed',
    },
    billed: 100,
    customer: {
      _id: '5c75019d4448ad001428dbed',
      identity: {
        title: 'M.',
        lastname: 'Boetie',
        firstname: 'Jean-Marc',
        birthDate: '1931-02-02T00:00:00.000Z',
      },
      payment: {
        mandates: [
          {
            _id: '5c75019d4448ad001428dbee',
            rum: 'R190200020290F6610BF307CEA7F6D',
            createdAt: '2019-02-26T09:06:37.366Z',
            signedAt: '2019-03-07T13:23:56.792Z',
          },
        ],
        iban: 'FR7630066899101763227534345',
        bankAccountOwner: 'Test',
        bic: 'AGFBFRCC',
      },
    },
    paid: 0,
    balance: -100,
  };

  it('should check if bill can be direct debited', () => {
    expect(BalanceHelper.canBeDirectDebited(bill)).toBe(true);
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
      assertion: 'client has no iban',
      bill: _.cloneDeep(bill),
      update() {
        delete this.bill.customer.payment.iban;
      },
    },
    {
      assertion: 'client has no bic',
      bill: _.cloneDeep(bill),
      update() {
        delete this.bill.customer.payment.bic;
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
    {
      assertion: 'client has no bank account name',
      bill: _.cloneDeep(bill),
      update() {
        delete this.bill.customer.payment.bankAccountOwner;
      },
    },
  ];

  falsyTests.forEach((test) => {
    it(`should return false if ${test.assertion}`, () => {
      if (test.update) test.update();
      expect(BalanceHelper.canBeDirectDebited(test.bill)).toBe(false);
    });
  });
});

describe('computeTotal', () => {
  it('should compute total with payment', () => {
    expect(BalanceHelper.computeTotal('payment', 100, 50)).toEqual(150);
  });

  it('should compute total without payment', () => {
    expect(BalanceHelper.computeTotal('toto', 100, 50)).toEqual(50);
  });
});

describe('computePayments', () => {
  let computeTotal;
  beforeEach(() => {
    computeTotal = sinon.stub(BalanceHelper, 'computeTotal');
  });
  afterEach(() => {
    computeTotal.restore();
  });

  it('should return 0 as payment is undefined', () => {
    expect(BalanceHelper.computePayments()).toEqual(0);
  });

  it('should return 0 as payment is not an array', () => {
    expect(BalanceHelper.computePayments({})).toEqual(0);
  });

  it('should return 0 as payment is empty', () => {
    expect(BalanceHelper.computePayments([])).toEqual(0);
  });

  it('should compute payments for customer', () => {
    const customerId = new ObjectID();
    const ids = { customer: customerId };
    const payments = [{ netInclTaxes: 14, nature: 'payment' }, { netInclTaxes: 12, nature: 'refund' }, { netInclTaxes: 23, nature: 'payment' }];

    computeTotal.onCall(0).returns(14);
    computeTotal.onCall(1).returns(2);
    computeTotal.onCall(2).returns(25);

    expect(BalanceHelper.computePayments(payments, ids)).toEqual(25);
  });
});

describe('getBalance', () => {
  let computePayments;
  let canBeDirectDebited;
  beforeEach(() => {
    computePayments = sinon.stub(BalanceHelper, 'computePayments');
    canBeDirectDebited = sinon.stub(BalanceHelper, 'canBeDirectDebited');
  });
  afterEach(() => {
    computePayments.restore();
    canBeDirectDebited.restore();
  });

  it('should format balance for customer without credit notes and payment', () => {
    const customerId = new ObjectID();
    const bill = {
      _id: { customer: customerId },
      billed: 70,
      customer: {
        payment: {
          bankAccountOwner: 'Test',
          bid: 'QWERTYUIOP',
          iban: 'FR2345672344523455432234',
          mandates: [{ _id: new ObjectID(), createdAt: moment().toISOString(), signedAt: moment().toISOString() }],
        },
      },
    };
    canBeDirectDebited.returns(true);

    const result = BalanceHelper.getBalance(bill, [], [], []);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(70);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-70);
    expect(result.toPay).toEqual(70);
    sinon.assert.notCalled(computePayments);
  });

  it('should format balance for customer with credit notes and without payment', () => {
    const customerId = new ObjectID();
    const bill = {
      _id: { customer: customerId },
      billed: 70,
      customer: {
        payment: {
          bankAccountOwner: 'Test',
          bid: 'QWERTYUIOP',
          iban: 'FR2345672344523455432234',
          mandates: [{ _id: new ObjectID(), createdAt: moment().toISOString(), signedAt: moment().toISOString() }],
        },
      },
    };
    const customerCreditNotes = [
      { _id: { customer: customerId }, customer: { _id: customerId }, refund: 50 },
      { _id: { customer: new ObjectID() }, refund: 90 },
    ];
    canBeDirectDebited.returns(true);

    const result = BalanceHelper.getBalance(bill, customerCreditNotes, [], []);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(20);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-20);
    expect(result.toPay).toEqual(20);
    sinon.assert.notCalled(computePayments);
  });

  it('should format balance for customer with credit notes and payments', () => {
    const customerId = new ObjectID();
    const bill = {
      _id: { customer: customerId },
      billed: 170,
      customer: {
        payment: {
          bankAccountOwner: 'Test',
          bid: 'QWERTYUIOP',
          iban: 'FR2345672344523455432234',
          mandates: [{ _id: new ObjectID(), createdAt: '2019-05-24T09:00:00', signedAt: '2019-05-24T09:00:00' }],
        },
      },
    };
    const customerCreditNotes = [
      { _id: { customer: customerId }, customer: { _id: customerId }, refund: 50 },
      { _id: { customer: new ObjectID() }, refund: 90 },
    ];
    const payments = [
      { _id: { customer: customerId }, payments: [{ nature: 'payment', netInclTaxes: 80 }, { nature: 'payment', netInclTaxes: 30 }] },
      { _id: { customer: new ObjectID() }, payments: [{ nature: 'payment', netInclTaxes: 50 }] },
    ];
    canBeDirectDebited.returns(true);
    computePayments.returns(110);

    const result = BalanceHelper.getBalance(bill, customerCreditNotes, [], payments);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(120);
    expect(result.paid).toEqual(110);
    expect(result.balance).toEqual(-10);
    expect(result.toPay).toEqual(10);
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
    canBeDirectDebited.returns(false);

    const result = BalanceHelper.getBalance(bill, [], tppCreditNotes, []);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(30);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-30);
    expect(result.toPay).toEqual(0);
    sinon.assert.notCalled(computePayments);
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
      { _id: { customer: customerId, tpp: new ObjectID() }, refund: 50 },
      { _id: { customer: new ObjectID(), tpp: tppId }, refund: 50 },
    ];
    const payments = [
      { _id: { customer: customerId, tpp: tppId }, payments: [{ nature: 'refund', netInclTaxes: 80 }, { nature: 'payment', netInclTaxes: 30 }] },
      { _id: { customer: customerId, tpp: tppId }, payments: [{ nature: 'payment', netInclTaxes: 50 }] },
    ];
    canBeDirectDebited.returns(false);
    computePayments.returns(-50);

    const result = BalanceHelper.getBalance(bill, [], tppCreditNotes, payments);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(30);
    expect(result.paid).toEqual(-50);
    expect(result.balance).toEqual(-80);
    expect(result.toPay).toEqual(0);
  });
});

describe('getBalances', () => {
  let findBillsAmountsGroupedByClient;
  let findCNAmountsGroupedByCustomer;
  let findCNAmountsGroupedByTpp;
  let findPaymentsAmountsGroupedByClient;
  let getBalance;
  let getBalancesFromCreditNotes;
  let getBalancesFromPayments;

  const customers = [new ObjectID(), new ObjectID(), new ObjectID()];
  const tpps = [new ObjectID(), new ObjectID()];

  beforeEach(() => {
    findBillsAmountsGroupedByClient = sinon.stub(BillRepository, 'findAmountsGroupedByClient');
    findCNAmountsGroupedByCustomer = sinon.stub(CreditNoteRepository, 'findAmountsGroupedByCustomer');
    findCNAmountsGroupedByTpp = sinon.stub(CreditNoteRepository, 'findAmountsGroupedByTpp');
    findPaymentsAmountsGroupedByClient = sinon.stub(PaymentRepository, 'findAmountsGroupedByClient');
    getBalance = sinon.stub(BalanceHelper, 'getBalance');
    getBalancesFromCreditNotes = sinon.stub(BalanceHelper, 'getBalancesFromCreditNotes');
    getBalancesFromPayments = sinon.stub(BalanceHelper, 'getBalancesFromPayments');

    getBalance.returnsArg(0);
    getBalancesFromCreditNotes.returnsArg(0);
    getBalancesFromPayments.returnsArg(0);
  });

  afterEach(() => {
    findBillsAmountsGroupedByClient.restore();
    findCNAmountsGroupedByCustomer.restore();
    findCNAmountsGroupedByTpp.restore();
    findPaymentsAmountsGroupedByClient.restore();
    getBalance.restore();
    getBalancesFromCreditNotes.restore();
    getBalancesFromPayments.restore();
  });

  it('should return no balance', async () => {
    findBillsAmountsGroupedByClient.returns([]);
    findCNAmountsGroupedByCustomer.returns([]);
    findCNAmountsGroupedByTpp.returns([]);
    findPaymentsAmountsGroupedByClient.returns([]);

    const balances = await BalanceHelper.getBalances();

    expect(balances).toEqual([]);

    sinon.assert.notCalled(getBalance);
    sinon.assert.notCalled(getBalancesFromCreditNotes);
    sinon.assert.notCalled(getBalancesFromPayments);
  });

  it('should return balances from bills', async () => {
    const billsAmountsGroupedByClient = [
      { _id: { customer: customers[0] } },
      { _id: { customer: customers[1] } },
      { _id: { customer: customers[0], tpp: tpps[0] } },
    ];
    findBillsAmountsGroupedByClient.returns(billsAmountsGroupedByClient);
    findCNAmountsGroupedByCustomer.returns([]);
    findCNAmountsGroupedByTpp.returns([]);
    findPaymentsAmountsGroupedByClient.returns([]);

    const balances = await BalanceHelper.getBalances();

    expect(balances).toEqual(billsAmountsGroupedByClient);

    sinon.assert.callCount(getBalance, billsAmountsGroupedByClient.length);
    sinon.assert.notCalled(getBalancesFromCreditNotes);
    sinon.assert.notCalled(getBalancesFromPayments);
  });

  it('should return balances from customer credit notes', async () => {
    const cnAmountsGroupedByCustomer = [
      { _id: { customer: customers[0] } },
      { _id: { customer: customers[1] } },
      { _id: { customer: customers[2] } },
    ];
    findBillsAmountsGroupedByClient.returns([]);
    findCNAmountsGroupedByCustomer.returns(cnAmountsGroupedByCustomer);
    findCNAmountsGroupedByTpp.returns([]);
    findPaymentsAmountsGroupedByClient.returns([]);

    const balances = await BalanceHelper.getBalances();

    expect(balances).toEqual(cnAmountsGroupedByCustomer);

    sinon.assert.notCalled(getBalance);
    sinon.assert.callCount(getBalancesFromCreditNotes, cnAmountsGroupedByCustomer.length);
    sinon.assert.notCalled(getBalancesFromPayments);
  });

  it('should return balances from TPP credit notes', async () => {
    const cnAmountsGroupedByTpp = [
      { _id: { customer: customers[0], tpp: tpps[0] } },
      { _id: { customer: customers[1], tpp: tpps[1] } },
    ];
    findBillsAmountsGroupedByClient.returns([]);
    findCNAmountsGroupedByCustomer.returns([]);
    findCNAmountsGroupedByTpp.returns(cnAmountsGroupedByTpp);
    findPaymentsAmountsGroupedByClient.returns([]);

    const balances = await BalanceHelper.getBalances();

    expect(balances).toEqual(cnAmountsGroupedByTpp);

    sinon.assert.notCalled(getBalance);
    sinon.assert.callCount(getBalancesFromCreditNotes, cnAmountsGroupedByTpp.length);
    sinon.assert.notCalled(getBalancesFromPayments);
  });

  it('should return balances from payments', async () => {
    const paymentsAmountsGroupedByClient = [
      { _id: { customer: customers[0] } },
      { _id: { customer: customers[1] } },
      { _id: { customer: customers[2] } },
      { _id: { customer: customers[0], tpp: tpps[0] } },
      { _id: { customer: customers[1], tpp: tpps[1] } },
    ];
    findBillsAmountsGroupedByClient.returns([]);
    findCNAmountsGroupedByCustomer.returns([]);
    findCNAmountsGroupedByTpp.returns([]);
    findPaymentsAmountsGroupedByClient.returns(paymentsAmountsGroupedByClient);

    const balances = await BalanceHelper.getBalances();

    expect(balances).toEqual(paymentsAmountsGroupedByClient);

    sinon.assert.notCalled(getBalance);
    sinon.assert.notCalled(getBalancesFromCreditNotes);
    sinon.assert.callCount(getBalancesFromPayments, paymentsAmountsGroupedByClient.length);
  });

  it('should return balances from bills, credit notes and payments', async () => {
    const billsAmountsGroupedByClient = [
      { _id: { customer: customers[1] } },
      { _id: { customer: customers[2] } },
      { _id: { customer: customers[1], tpp: tpps[1] } },
    ];
    const cnAmountsGroupedByCustomer = [
      { _id: { customer: customers[0] } },
      { _id: { customer: customers[2] } },
    ];
    const cnAmountsGroupedByTpp = [
      { _id: { customer: customers[1], tpp: tpps[1] } },
    ];
    const paymentsAmountsGroupedByClient = [
      { _id: { customer: customers[0] } },
      { _id: { customer: customers[1] } },
      { _id: { customer: customers[2] } },
      { _id: { customer: customers[0], tpp: tpps[0] } },
    ];
    findBillsAmountsGroupedByClient.returns(billsAmountsGroupedByClient);
    findCNAmountsGroupedByCustomer.returns(cnAmountsGroupedByCustomer);
    findCNAmountsGroupedByTpp.returns(cnAmountsGroupedByTpp);
    findPaymentsAmountsGroupedByClient.returns(paymentsAmountsGroupedByClient);

    const allAmounts = [
      { _id: { customer: customers[0] } },
      { _id: { customer: customers[1] } },
      { _id: { customer: customers[2] } },
      { _id: { customer: customers[0], tpp: tpps[0] } },
      { _id: { customer: customers[1], tpp: tpps[1] } },
    ];

    const balances = await BalanceHelper.getBalances();

    expect(balances).toEqual(expect.arrayContaining(allAmounts));
    expect(balances.length).toEqual(allAmounts.length);

    sinon.assert.callCount(getBalance, 3);
    sinon.assert.callCount(getBalancesFromCreditNotes, 1);
    sinon.assert.callCount(getBalancesFromPayments, 1);
  });
});
