const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const _ = require('lodash');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const BalanceHelper = require('../../../src/helpers/balances');
const BillHelper = require('../../../src/helpers/bills');
const PaymentHelper = require('../../../src/helpers/payments');
const CreditNoteHelper = require('../../../src/helpers/creditNotes');
const UtilsHelper = require('../../../src/helpers/utils');
const BillRepository = require('../../../src/repositories/BillRepository');
const CreditNoteRepository = require('../../../src/repositories/CreditNoteRepository');
const PaymentRepository = require('../../../src/repositories/PaymentRepository');
const SinonMongoose = require('../sinonMongoose');

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
        title: 'mr',
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
  };

  it('should check if bill can be direct debited', () => {
    expect(BalanceHelper.canBeDirectDebited(bill)).toBe(true);
  });

  const falsyTests = [
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
    const payments = [
      { netInclTaxes: 14, nature: 'payment' },
      { netInclTaxes: 12, nature: 'refund' },
      { netInclTaxes: 23, nature: 'payment' },
    ];

    computeTotal.onCall(0).returns(14);
    computeTotal.onCall(1).returns(2);
    computeTotal.onCall(2).returns(25);

    expect(BalanceHelper.computePayments(payments, ids)).toEqual(25);
  });
});

describe('formatParticipationRate', () => {
  let mergeLastVersionWithBaseObject;
  beforeEach(() => {
    mergeLastVersionWithBaseObject = sinon.stub(UtilsHelper, 'mergeLastVersionWithBaseObject');
  });
  afterEach(() => {
    mergeLastVersionWithBaseObject.restore();
  });

  it('should return 0 if no funding and thirdPartyPayer', () => {
    const balanceDocument = {
      customer: {},
      thirdPartyPayer: { _id: new ObjectID() },
    };
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];
    const result = BalanceHelper.formatParticipationRate(balanceDocument, tppList);

    expect(result).toEqual(0);
  });
  it('should return 0 if thirdPartyPayer', () => {
    const thirdPartyPayerId = new ObjectID();
    const balanceDocument = {
      customer: {
        fundings: [
          { thirdPartyPayer: thirdPartyPayerId, versions: [{ customerParticipationRate: 30 }] },
          { thirdPartyPayer: new ObjectID(), versions: [] },
        ],
      },
      thirdPartyPayer: { _id: new ObjectID() },
    };
    const tppList = [{ _id: thirdPartyPayerId, isApa: false }, { _id: new ObjectID(), isApa: true }];
    const result = BalanceHelper.formatParticipationRate(balanceDocument, tppList);

    expect(result).toEqual(0);
  });
  it('should return 100 if no funding and no thirdPartyPayer', () => {
    const balanceDocument = { customer: {} };
    const result = BalanceHelper.formatParticipationRate(balanceDocument);

    expect(result).toEqual(100);
  });
  it('should return 100 if no apa funding and no thirdPartyPayer', () => {
    const balanceDocument = {
      customer: {
        fundings: [
          { thirdPartyPayer: new ObjectID(), versions: [] },
          { thirdPartyPayer: new ObjectID(), versions: [] },
        ],
      },
    };
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];
    const result = BalanceHelper.formatParticipationRate(balanceDocument, tppList);

    expect(result).toEqual(100);
  });
  it('should return participation rate for customer', () => {
    const thirdPartyPayerId = new ObjectID();
    const balanceDocument = {
      customer: {
        fundings: [
          { thirdPartyPayer: thirdPartyPayerId, versions: [{ customerParticipationRate: 30 }] },
          { thirdPartyPayer: new ObjectID(), versions: [] },
        ],
      },
    };
    const tppList = [{ _id: thirdPartyPayerId, isApa: true }, { _id: new ObjectID(), isApa: false }];
    mergeLastVersionWithBaseObject.returns({ customerParticipationRate: 30 });

    const result = BalanceHelper.formatParticipationRate(balanceDocument, tppList);

    expect(result).toEqual(30);
  });
});

describe('getBalance', () => {
  let computePayments;
  let canBeDirectDebited;
  let formatParticipationRate;
  beforeEach(() => {
    computePayments = sinon.stub(BalanceHelper, 'computePayments');
    canBeDirectDebited = sinon.stub(BalanceHelper, 'canBeDirectDebited');
    formatParticipationRate = sinon.stub(BalanceHelper, 'formatParticipationRate');
  });
  afterEach(() => {
    computePayments.restore();
    canBeDirectDebited.restore();
    formatParticipationRate.restore();
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
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];
    canBeDirectDebited.returns(true);
    formatParticipationRate.returns(10);

    const result = BalanceHelper.getBalance(bill, [], [], [], tppList);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(70);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-70);
    expect(result.toPay).toEqual(70);
    expect(result.participationRate).toEqual(10);
    sinon.assert.notCalled(computePayments);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, bill, tppList);
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
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];
    canBeDirectDebited.returns(true);
    formatParticipationRate.returns(10);

    const result = BalanceHelper.getBalance(bill, customerCreditNotes, [], [], tppList);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(20);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-20);
    expect(result.toPay).toEqual(20);
    expect(result.participationRate).toEqual(10);
    sinon.assert.notCalled(computePayments);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, bill, tppList);
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
      {
        _id: { customer: customerId },
        payments: [
          { nature: 'payment', netInclTaxes: 80 },
          { nature: 'payment', netInclTaxes: 30 },
        ],
      },
      { _id: { customer: new ObjectID() }, payments: [{ nature: 'payment', netInclTaxes: 50 }] },
    ];
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];
    canBeDirectDebited.returns(true);
    computePayments.returns(110);
    formatParticipationRate.returns(10);

    const result = BalanceHelper.getBalance(bill, customerCreditNotes, [], payments, tppList);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(120);
    expect(result.paid).toEqual(110);
    expect(result.balance).toEqual(-10);
    expect(result.participationRate).toEqual(10);
    expect(result.toPay).toEqual(10);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, bill, tppList);
  });

  it('should format balance for tpp with credit notes and without payment', () => {
    const customerId = new ObjectID();
    const tppId = new ObjectID();
    const bill = {
      _id: { customer: customerId, tpp: tppId },
      billed: 70,
      customer: {
        payment: {
          bankAccountOwner: 'Test',
          bid: 'QWERTYUIOP',
          iban: 'FR2345672344523455432234',
          mandates: [{ _id: new ObjectID(), createdAt: '2019-05-24T09:00:00', signedAt: '2019-05-24T09:00:00' }],
        },
      },
    };
    const tppCreditNotes = [
      { _id: { customer: customerId, tpp: tppId }, refund: 40, customer: customerId },
      { _id: { customer: new ObjectID(), tpp: tppId }, refund: 40 },
      { _id: { customer: customerId, tpp: new ObjectID() }, refund: 50 },
    ];
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];
    canBeDirectDebited.returns(false);
    formatParticipationRate.returns(10);

    const result = BalanceHelper.getBalance(bill, [], tppCreditNotes, [], tppList);
    expect(result).toBeDefined();
    expect(result.billed).toEqual(30);
    expect(result.paid).toEqual(0);
    expect(result.balance).toEqual(-30);
    expect(result.toPay).toEqual(0);
    expect(result.participationRate).toEqual(10);
    expect(result.lastCesuDate).toEqual(null);
    sinon.assert.notCalled(computePayments);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, bill, tppList);
  });

  it('should format balance for tpp with credit notes and payments', () => {
    const customerId = new ObjectID();
    const tppId = new ObjectID();
    const bill = {
      _id: { customer: customerId, tpp: tppId },
      billed: 70,
      customer: {
        payment: {
          bankAccountOwner: 'Test',
          bid: 'QWERTYUIOP',
          iban: 'FR2345672344523455432234',
          mandates: [{ _id: new ObjectID(), createdAt: '2019-05-24T09:00:00', signedAt: '2019-05-24T09:00:00' }],
        },
      },
    };
    const tppCreditNotes = [
      { _id: { customer: customerId, tpp: tppId }, refund: 40 },
      { _id: { customer: customerId, tpp: new ObjectID() }, refund: 50 },
      { _id: { customer: new ObjectID(), tpp: tppId }, refund: 50 },
    ];
    const payments = [
      {
        _id: { customer: customerId, tpp: tppId },
        payments: [
          { nature: 'refund', netInclTaxes: 80, type: 'direct_debit' },
          { nature: 'payment', netInclTaxes: 30, type: 'direct_debit' },
          { nature: 'payment', type: 'cesu', date: '2021-06-25T14:00:18' },
          { nature: 'payment', type: 'cesu', date: '2021-07-27T14:00:18' },
        ],
      },
      {
        _id: { customer: customerId, tpp: tppId },
        payments: [{ nature: 'payment', netInclTaxes: 50, type: 'direct_debit' }],
      },
    ];
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];
    canBeDirectDebited.returns(false);
    computePayments.returns(-50);
    formatParticipationRate.returns(10);

    const result = BalanceHelper.getBalance(bill, [], tppCreditNotes, payments, tppList);

    expect(result).toBeDefined();
    expect(result.billed).toEqual(30);
    expect(result.paid).toEqual(-50);
    expect(result.balance).toEqual(-80);
    expect(result.toPay).toEqual(0);
    expect(result.participationRate).toEqual(10);
    expect(result.lastCesuDate).toEqual('2021-07-27T14:00:18');
    sinon.assert.calledOnceWithExactly(formatParticipationRate, bill, tppList);
  });
});

describe('getBalancesFromCreditNotes', () => {
  let formatParticipationRate;
  let computePayments;
  beforeEach(() => {
    formatParticipationRate = sinon.stub(BalanceHelper, 'formatParticipationRate');
    computePayments = sinon.stub(BalanceHelper, 'computePayments');
  });
  afterEach(() => {
    formatParticipationRate.restore();
    computePayments.restore();
  });

  it('should format balance for customer credit note', () => {
    const customerId = new ObjectID();
    const creditNote = {
      _id: { customer: customerId },
      customer: { identity: {} },
      refund: 25,
    };
    const payments = [
      { _id: { customer: customerId }, payments: [{ refund: 12 }] },
      { _id: { customer: customerId, tpp: new ObjectID() }, payments: [{ refund: 15 }] },
    ];
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];

    computePayments.returns(12);
    formatParticipationRate.returns(30);

    const result = BalanceHelper.getBalancesFromCreditNotes(creditNote, payments, tppList);

    expect(result).toEqual({
      customer: { identity: {} },
      billed: -25,
      paid: 12,
      toPay: 0,
      participationRate: 30,
      balance: 37,
    });
    sinon.assert.calledOnceWithExactly(computePayments, [{ refund: 12 }]);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, creditNote, tppList);
  });
  it('should format balance for tpp credit note', () => {
    const customerId = new ObjectID();
    const tppId = new ObjectID();
    const creditNote = {
      _id: { customer: customerId, tpp: tppId },
      customer: { identity: {} },
      refund: 25,
      thirdPartyPayer: { _id: tppId },
    };
    const payments = [
      { _id: { customer: customerId }, payments: [{ refund: 12 }] },
      { _id: { customer: customerId, tpp: tppId }, payments: [{ refund: 15 }] },
    ];
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];

    computePayments.returns(15);
    formatParticipationRate.returns(30);

    const result = BalanceHelper.getBalancesFromCreditNotes(creditNote, payments, tppList);

    expect(result).toEqual({
      customer: { identity: {} },
      billed: -25,
      paid: 15,
      toPay: 0,
      participationRate: 30,
      balance: 40,
      thirdPartyPayer: { _id: tppId },
    });
    sinon.assert.calledOnceWithExactly(computePayments, [{ refund: 15 }]);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, creditNote, tppList);
  });
  it('should format not call compute payments as no payment', () => {
    const customerId = new ObjectID();
    const creditNote = {
      _id: { customer: customerId },
      customer: { identity: {} },
      refund: 25,
    };
    const payments = [
      { _id: { customer: customerId, tpp: new ObjectID() }, payments: [{ refund: 15 }] },
    ];
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];

    computePayments.returns(12);
    formatParticipationRate.returns(30);

    const result = BalanceHelper.getBalancesFromCreditNotes(creditNote, payments, tppList);

    expect(result).toEqual({
      customer: { identity: {} },
      billed: -25,
      paid: 0,
      toPay: 0,
      participationRate: 30,
      balance: 25,
    });
    sinon.assert.notCalled(computePayments);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, creditNote, tppList);
  });
});

describe('getBalancesFromPayments', () => {
  let formatParticipationRate;
  let computePayments;
  beforeEach(() => {
    formatParticipationRate = sinon.stub(BalanceHelper, 'formatParticipationRate');
    computePayments = sinon.stub(BalanceHelper, 'computePayments');
  });
  afterEach(() => {
    formatParticipationRate.restore();
    computePayments.restore();
  });

  it('should format balance for customer payments', () => {
    const payment = {
      customer: { identity: {} },
      payments: [{ refund: 12 }],
    };
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];

    computePayments.returns(12);
    formatParticipationRate.returns(30);

    const result = BalanceHelper.getBalancesFromPayments(payment, tppList);

    expect(result).toEqual({
      customer: { identity: {} },
      billed: 0,
      paid: 12,
      toPay: 0,
      participationRate: 30,
      balance: 12,
    });
    sinon.assert.calledOnceWithExactly(computePayments, [{ refund: 12 }]);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, payment, tppList);
  });
  it('should format balance for tpp payments', () => {
    const payment = {
      customer: { identity: {} },
      payments: [{ refund: 12 }],
      thirdPartyPayer: { isApa: true },
    };
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];

    computePayments.returns(12);
    formatParticipationRate.returns(30);

    const result = BalanceHelper.getBalancesFromPayments(payment, tppList);

    expect(result).toEqual({
      customer: { identity: {} },
      billed: 0,
      paid: 12,
      toPay: 0,
      participationRate: 30,
      balance: 12,
      thirdPartyPayer: { isApa: true },
    });
    sinon.assert.calledOnceWithExactly(computePayments, [{ refund: 12 }]);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, payment, tppList);
  });
  it('should format not call compute payments as no payment', () => {
    const payment = {
      customer: { identity: {} },
      thirdPartyPayer: { isApa: true },
    };
    const tppList = [{ _id: new ObjectID(), isApa: false }, { _id: new ObjectID(), isApa: true }];

    formatParticipationRate.returns(30);

    const result = BalanceHelper.getBalancesFromPayments(payment, tppList);

    expect(result).toEqual({
      customer: { identity: {} },
      billed: 0,
      paid: 0,
      toPay: 0,
      participationRate: 30,
      balance: 0,
      thirdPartyPayer: { isApa: true },
    });
    sinon.assert.notCalled(computePayments);
    sinon.assert.calledOnceWithExactly(formatParticipationRate, payment, tppList);
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
  let findThirdPartyPayer;

  const customers = [new ObjectID(), new ObjectID(), new ObjectID()];
  const tpps = [new ObjectID(), new ObjectID()];
  const credentials = { company: { _id: new ObjectID() } };
  const customerId = new ObjectID();
  const maxDate = new Date('2019-01-01');

  beforeEach(() => {
    findBillsAmountsGroupedByClient = sinon.stub(BillRepository, 'findAmountsGroupedByClient');
    findCNAmountsGroupedByCustomer = sinon.stub(CreditNoteRepository, 'findAmountsGroupedByCustomer');
    findCNAmountsGroupedByTpp = sinon.stub(CreditNoteRepository, 'findAmountsGroupedByTpp');
    findPaymentsAmountsGroupedByClient = sinon.stub(PaymentRepository, 'findAmountsGroupedByClient');
    getBalance = sinon.stub(BalanceHelper, 'getBalance');
    getBalancesFromCreditNotes = sinon.stub(BalanceHelper, 'getBalancesFromCreditNotes');
    getBalancesFromPayments = sinon.stub(BalanceHelper, 'getBalancesFromPayments');
    findThirdPartyPayer = sinon.stub(ThirdPartyPayer, 'find');

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
    findThirdPartyPayer.restore();
  });

  it('should return no balance', async () => {
    findBillsAmountsGroupedByClient.returns([]);
    findCNAmountsGroupedByCustomer.returns([]);
    findCNAmountsGroupedByTpp.returns([]);
    findPaymentsAmountsGroupedByClient.returns([]);
    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

    const balances = await BalanceHelper.getBalances(credentials, customerId, maxDate);

    expect(balances).toEqual([]);

    sinon.assert.notCalled(getBalance);
    sinon.assert.notCalled(getBalancesFromCreditNotes);
    sinon.assert.notCalled(getBalancesFromPayments);
    sinon.assert.calledOnceWithExactly(findBillsAmountsGroupedByClient, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByCustomer, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByTpp, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(
      findPaymentsAmountsGroupedByClient,
      credentials.company._id,
      customerId,
      maxDate
    );
    SinonMongoose.calledWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
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
    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

    const balances = await BalanceHelper.getBalances(credentials, customerId, maxDate);

    expect(balances).toEqual(billsAmountsGroupedByClient);

    sinon.assert.callCount(getBalance, billsAmountsGroupedByClient.length);
    sinon.assert.notCalled(getBalancesFromCreditNotes);
    sinon.assert.notCalled(getBalancesFromPayments);
    sinon.assert.calledOnceWithExactly(findBillsAmountsGroupedByClient, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByCustomer, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByTpp, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(
      findPaymentsAmountsGroupedByClient, credentials.company._id, customerId, maxDate
    );
    SinonMongoose.calledWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
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
    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

    const balances = await BalanceHelper.getBalances(credentials, customerId, maxDate);

    expect(balances).toEqual(cnAmountsGroupedByCustomer);

    sinon.assert.notCalled(getBalance);
    sinon.assert.callCount(getBalancesFromCreditNotes, cnAmountsGroupedByCustomer.length);
    sinon.assert.notCalled(getBalancesFromPayments);
    sinon.assert.calledOnceWithExactly(findBillsAmountsGroupedByClient, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByCustomer, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByTpp, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(
      findPaymentsAmountsGroupedByClient,
      credentials.company._id,
      customerId,
      maxDate
    );
    SinonMongoose.calledWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
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
    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

    const balances = await BalanceHelper.getBalances(credentials, customerId, maxDate);

    expect(balances).toEqual(cnAmountsGroupedByTpp);

    sinon.assert.notCalled(getBalance);
    sinon.assert.callCount(getBalancesFromCreditNotes, cnAmountsGroupedByTpp.length);
    sinon.assert.notCalled(getBalancesFromPayments);
    sinon.assert.calledOnceWithExactly(findBillsAmountsGroupedByClient, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByCustomer, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByTpp, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(
      findPaymentsAmountsGroupedByClient,
      credentials.company._id,
      customerId,
      maxDate
    );
    SinonMongoose.calledWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
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
    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

    const balances = await BalanceHelper.getBalances(credentials, customerId, maxDate);

    expect(balances).toEqual(paymentsAmountsGroupedByClient);

    sinon.assert.notCalled(getBalance);
    sinon.assert.notCalled(getBalancesFromCreditNotes);
    sinon.assert.callCount(getBalancesFromPayments, paymentsAmountsGroupedByClient.length);
    sinon.assert.calledOnceWithExactly(findBillsAmountsGroupedByClient, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByCustomer, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByTpp, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(
      findPaymentsAmountsGroupedByClient,
      credentials.company._id,
      customerId,
      maxDate
    );
    SinonMongoose.calledWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
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
    findThirdPartyPayer.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

    const allAmounts = [
      { _id: { customer: customers[0] } },
      { _id: { customer: customers[1] } },
      { _id: { customer: customers[2] } },
      { _id: { customer: customers[0], tpp: tpps[0] } },
      { _id: { customer: customers[1], tpp: tpps[1] } },
    ];

    const balances = await BalanceHelper.getBalances(credentials, customerId, maxDate);

    expect(balances).toEqual(expect.arrayContaining(allAmounts));
    expect(balances.length).toEqual(allAmounts.length);

    sinon.assert.callCount(getBalance, 3);
    sinon.assert.callCount(getBalancesFromCreditNotes, 1);
    sinon.assert.callCount(getBalancesFromPayments, 1);
    sinon.assert.calledOnceWithExactly(findBillsAmountsGroupedByClient, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByCustomer, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(findCNAmountsGroupedByTpp, credentials.company._id, customerId, maxDate);
    sinon.assert.calledOnceWithExactly(
      findPaymentsAmountsGroupedByClient,
      credentials.company._id,
      customerId,
      maxDate
    );
    SinonMongoose.calledWithExactly(
      findThirdPartyPayer,
      [{ query: 'find', args: [{ company: credentials.company._id }] }, { query: 'lean' }]
    );
  });
});

describe('getBalancesWithDetails', () => {
  let getBalancesStub;
  let getBillsStub;
  let getPaymentsStub;
  let getCreditNotesStub;

  beforeEach(() => {
    getBalancesStub = sinon.stub(BalanceHelper, 'getBalances');
    getBillsStub = sinon.stub(BillHelper, 'getBills');
    getPaymentsStub = sinon.stub(PaymentHelper, 'getPayments');
    getCreditNotesStub = sinon.stub(CreditNoteHelper, 'getCreditNotes');
  });
  afterEach(() => {
    getBalancesStub.restore();
    getBillsStub.restore();
    getPaymentsStub.restore();
    getCreditNotesStub.restore();
  });

  it('should get balances with details', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { customer: new ObjectID(), startDate: '2019-12-01', endDate: '2019-12-05' };

    getBalancesStub.returns({ balance: 10 });
    getBillsStub.returns([{ name: 'bills' }]);
    getPaymentsStub.returns([{ name: 'payments' }]);
    getCreditNotesStub.returns([{ name: 'creditNotes' }]);

    const result = await BalanceHelper.getBalancesWithDetails(query, credentials);

    expect(result.balances).toEqual({ balance: 10 });
    expect(result.bills).toEqual([{ name: 'bills' }]);
    expect(result.payments).toEqual([{ name: 'payments' }]);
    expect(result.creditNotes).toEqual([{ name: 'creditNotes' }]);
    getBalancesStub.calledOnceWithExactly(credentials, query.customer, query.startDate);
    getBillsStub.calledOnceWithExactly(query, credentials);
    getPaymentsStub.calledOnceWithExactly(query, credentials);
    getCreditNotesStub.calledOnceWithExactly(query, credentials);
  });
});
