const sinon = require('sinon');
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

describe('createQuote', () => {
  let CustomerMock;
  let QuoteNumberMock;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    QuoteNumberMock = sinon.mock(QuoteNumber);
  });
  afterEach(() => {
    CustomerMock.restore();
    QuoteNumberMock.restore();
  });

  it('should get customer quotes', async () => {
    const customerId = '12345678io0';
    const payload = {
      subscriptions: [{ serviceName: 'Autonomie', unitTTCRate: 24, estimatedWeeklyVolume: 12 }],
    };
    const quoteNumber = { prefix: 'pre', seq: 2 };

    QuoteNumberMock.expects('findOneAndUpdate')
      .chain('lean')
      .once()
      .returns({ quoteNumber });
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId },
        { $push: { quotes: { ...payload, quoteNumber: 'pre-002' } } },
        { new: true, select: { identity: 1, quotes: 1 }, autopopulate: false }
      )
      .chain('lean')
      .once();

    await QuoteHelper.createQuote(customerId, payload);
    CustomerMock.verify();
    QuoteNumberMock.verify();
  });
});
