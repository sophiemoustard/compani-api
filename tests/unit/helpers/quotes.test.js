const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const expect = require('expect');
const Customer = require('../../../src/models/Customer');
const QuoteNumber = require('../../../src/models/QuoteNumber');
const QuoteHelper = require('../../../src/helpers/quotes');

require('sinon-mongoose');

describe('getQuotes', () => {
  let CustomerMock;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
  });
  afterEach(() => {
    CustomerMock.restore();
  });

  it('should get customer quotes', async () => {
    const customerId = '12345678io0';
    CustomerMock.expects('findOne')
      .withExactArgs(
        { _id: customerId, quotes: { $exists: true } },
        { identity: 1, quotes: 1 },
        { autopopulate: false }
      )
      .chain('lean')
      .once();

    await QuoteHelper.getQuotes(customerId);
    CustomerMock.verify();
  });
});

describe('getQuoteNumber', () => {
  it('should return quote number', async () => {
    const company = { _id: new ObjectID() };
    const QuoteNumberMock = sinon.mock(QuoteNumber);
    QuoteNumberMock
      .expects('findOneAndUpdate')
      .withExactArgs(
        { prefix: sinon.match(/\d{4}/), company: company._id },
        {},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      .chain('lean');

    await QuoteHelper.getQuoteNumber(company);

    QuoteNumberMock.verify();
  });
});

describe('formatQuoteNumber', () => {
  it('should format quote number', () => {
    expect(QuoteHelper.formatQuoteNumber(101, '1219', 1)).toBe('DEV-101121900001');
  });
});

describe('createQuote', () => {
  let CustomerMock;
  let QuoteNumberMock;
  let getQuoteNumberStub;
  let formatQuoteNumberStub;

  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    QuoteNumberMock = sinon.mock(QuoteNumber);
    getQuoteNumberStub = sinon.stub(QuoteHelper, 'getQuoteNumber');
    formatQuoteNumberStub = sinon.stub(QuoteHelper, 'formatQuoteNumber');
  });
  afterEach(() => {
    CustomerMock.restore();
    QuoteNumberMock.restore();
    getQuoteNumberStub.restore();
    formatQuoteNumberStub.restore();
  });

  it('should get customer quotes', async () => {
    const customerId = '12345678io0';
    const payload = {
      subscriptions: [{ serviceName: 'Autonomie', unitTTCRate: 24, estimatedWeeklyVolume: 12 }],
    };
    getQuoteNumberStub.returns({ prefix: 'pre', seq: 2 });
    formatQuoteNumberStub.returns('pre-002');
    const credentials = { company: { _id: new ObjectID(), prefixNumber: 101 } };

    CustomerMock
      .expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId },
        { $push: { quotes: { ...payload, quoteNumber: 'pre-002' } } },
        { new: true, select: { identity: 1, quotes: 1 }, autopopulate: false }
      )
      .chain('lean')
      .once();
    QuoteNumberMock
      .expects('updateOne')
      .withExactArgs({ prefix: 'pre', company: credentials.company._id }, { $set: { seq: 3 } });

    await QuoteHelper.createQuote(customerId, payload, credentials);

    CustomerMock.verify();
    QuoteNumberMock.verify();
    sinon.assert.calledWithExactly(getQuoteNumberStub, credentials.company);
    sinon.assert.calledWithExactly(formatQuoteNumberStub, credentials.company.prefixNumber, 'pre', 2);
  });
});
