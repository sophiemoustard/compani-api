const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const { ObjectID } = require('mongodb');

const Surcharge = require('../../../models/Surcharge');
const ThirdPartyPayer = require('../../../models/ThirdPartyPayer');
const FundingHistory = require('../../../models/FundingHistory');
const {
  populateSurcharge,
  populateFundings,
  getMatchingFunding,
  computeCustomSurcharge,
  applySurcharge,
  getExclTaxes,
  getInclTaxes,
  getThirdPartyPayerPrice,
  getMatchingHistory,
  getHourlyFundingSplit,
  getFixedFundingSplit,
  getEventPrice,
  formatDraftBillsForCustomer,
  formatDraftBillsForTPP,
  getDraftBillsPerSubscription,
} = require('../../../helpers/draftBills');

describe('populateSurcharge', () => {
  it('should populate surcharge and order versions', async () => {
    const surchargeId = new ObjectID();
    const returnedSurcharge = { _id: surchargeId, sundaySurcharge: 10 };
    const subscription = {
      _id: 'abc',
      versions: [
        { unitTTCRate: 13, startDate: new Date('2019-01-20'), _id: 5 },
        { unitTTCRate: 15, startDate: new Date('2019-02-24'), _id: 4 }
      ],
      service: {
        versions: [
          { startDate: new Date('2019-02-24'), _id: 1 },
          { surcharge: surchargeId, startDate: new Date('2019-03-20'), _id: 2 },
          { surcharge: surchargeId, startDate: new Date('2019-02-29'), _id: 3 },
        ],
      },
    };
    const findOne = sinon.stub(Surcharge, 'findOne').returns(returnedSurcharge);

    const result = await populateSurcharge(subscription);
    findOne.restore();

    expect(result).toBeDefined();
    expect(result._id).toEqual('abc');
    expect(result.versions.length).toEqual(2);
    expect(result.versions[0]._id).toEqual(4);
    expect(result.service.versions.length).toEqual(3);
    expect(result.service.versions[0]._id).toEqual(2);
    sinon.assert.callCount(findOne, 2);
  });
});

describe('populateFundings', () => {
  it('should return empty array if input empty', async () => {
    const result = await populateFundings([], new Date());
    expect(result).toEqual([]);
  });

  it('should populate third party payer funding', async () => {
    const tppId = new ObjectID();
    const fundings = [{ thirdPartyPayer: tppId, _id: 1, versions: [] }];
    const returnedTpp = { _id: tppId };
    const findOne = sinon.stub(ThirdPartyPayer, 'findOne').returns({ lean: () => returnedTpp });

    const result = await populateFundings(fundings, new Date());
    findOne.restore();

    expect(result).toBeDefined();
    expect(result[0].thirdPartyPayer).toBeDefined();
    expect(result[0].thirdPartyPayer._id).toEqual(tppId);
    sinon.assert.callCount(findOne, 1);
  });

  it('should populate funding history with once frequency and history', async () => {
    const versionId = new ObjectID();
    const fundings = [
      { versions: [{ frequency: 'once', _id: versionId }] },
    ];
    const returnedHistory = { careHours: 4, fundingVersion: versionId };
    const findOneTpp = sinon.stub(ThirdPartyPayer, 'findOne').returns({ lean: () => null });
    const findOne = sinon.stub(FundingHistory, 'findOne').returns({ lean: () => returnedHistory });

    const result = await populateFundings(fundings, new Date());
    findOneTpp.restore();
    findOne.restore();

    expect(result).toBeDefined();
    expect(result[0].versions[0].history).toBeDefined();
    expect(result[0].versions[0].history).toMatchObject({ careHours: 4, fundingVersion: versionId });
  });

  it('should populate funding history with once frequency and without history', async () => {
    const versionId = new ObjectID();
    const fundings = [
      { versions: [{ frequency: 'once', _id: versionId }] },
    ];
    const findOneTpp = sinon.stub(ThirdPartyPayer, 'findOne').returns({ lean: () => null });
    const findOne = sinon.stub(FundingHistory, 'findOne').returns({ lean: () => null });

    const result = await populateFundings(fundings, new Date());
    findOneTpp.restore();
    findOne.restore();

    expect(result).toBeDefined();
    expect(result[0].versions[0].history).toBeDefined();
    expect(result[0].versions[0].history).toMatchObject({ careHours: 0, amountTTC: 0, fundingVersion: versionId });
  });

  it('should populate funding history with monthly frequency', async () => {
    const versionId = new ObjectID();
    const fundings = [
      { versions: [{ frequency: 'monthly', _id: versionId }] },
    ];
    const returnedHistories = [
      { careHours: 3, fundingVersion: versionId, month: '01/2019' },
      { careHours: 5, fundingVersion: versionId, month: '02/2019' },
    ];
    const findOneTpp = sinon.stub(ThirdPartyPayer, 'findOne').returns({ lean: () => null });
    const find = sinon.stub(FundingHistory, 'find').returns(returnedHistories);

    const result = await populateFundings(fundings, new Date('2019/03/10'));
    findOneTpp.restore();
    find.restore();

    expect(result).toBeDefined();
    expect(result[0].versions[0].history).toBeDefined();
    expect(result[0].versions[0].history.length).toEqual(3);
    const addedHistory = result[0].versions[0].history.find(hist => hist.month === '03/2019');
    expect(addedHistory).toBeDefined();
    expect(addedHistory).toMatchObject({ careHours: 0, amountTTC: 0, fundingVersion: versionId, month: '03/2019' });
  });
});

describe('getMatchingFunding', () => {
  it('should return null if fundings is empty', () => {
    expect(getMatchingFunding(new Date(), [])).toBeNull();
  });

  it('should return matching version with random day', () => {
    const fundings = [
      {
        versions: [
          { _id: 1, careDays: [0, 2, 3], startDate: new Date('2019/03/23') },
          { _id: 3, careDays: [0, 3], startDate: new Date('2019/02/23') }
        ],
      },
      { versions: [{ _id: 2, careDays: [1, 5, 6], startDate: new Date('2019/04/23') }] },
    ];
    const result = getMatchingFunding(new Date('2019/04/23'), fundings);
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(2);
  });

  it('should return matching version with holidays', () => {
    const fundings = [
      {
        versions: [{ _id: 1, careDays: [0, 2, 3], startDate: new Date('2019/03/23') }],
      },
      { versions: [{ _id: 3, careDays: [4, 7], startDate: new Date('2019/04/23') }] },
    ];
    const result = getMatchingFunding(new Date('2019/05/01'), fundings);
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(3);
  });

  it('should return null if no matching version', () => {
    const fundings = [
      {
        versions: [
          { _id: 1, careDays: [0, 2, 3], startDate: new Date('2019/03/23') },
        ],
      },
      { versions: [{ _id: 2, careDays: [5, 6], startDate: new Date('2019/04/23') }] },
    ];
    const result = getMatchingFunding(new Date('2019/04/23'), fundings);
    expect(result).toBeNull();
  });
});

describe('computeCustomSurcharge', () => {
  const price = 12;
  const start = '09:00';
  const end = '12:00';
  const surcharge = 20;

  it('case 1 : dates included between start and end', () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(9),
      endDate: (new Date('2019/03/12')).setHours(11),
    };
    expect(Number.parseFloat(computeCustomSurcharge(event, start, end, surcharge, price).toFixed(1))).toEqual(14.4);
  });

  it('case 2 : startDate included between start and end and endDate after end', () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(8),
      endDate: (new Date('2019/03/12')).setHours(10),
    };
    expect(Number.parseFloat(computeCustomSurcharge(event, start, end, surcharge, price).toFixed(1))).toEqual(13.2);
  });

  it('case 3 : startDate before start and endDate included between start and end', () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(10),
      endDate: (new Date('2019/03/12')).setHours(13),
    };
    expect(Number.parseFloat(computeCustomSurcharge(event, start, end, surcharge, price).toFixed(1))).toEqual(13.6);
  });

  it('case 4 : startDate before start and endDate after endDate', () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(7),
      endDate: (new Date('2019/03/12')).setHours(13),
    };
    expect(Number.parseFloat(computeCustomSurcharge(event, start, end, surcharge, price).toFixed(1))).toEqual(13.2);
  });
});

describe('applySurcharge', () => {
  const price = 20;
  let event;
  let surcharge = {};
  it('should apply 25th of december surcharge', () => {
    event = { startDate: new Date('2019/12/25') };
    surcharge = { twentyFifthOfDecember: 20 };
    expect(applySurcharge(event, price, surcharge)).toEqual(24);
  });

  it('should not apply 25th of december surcharge', () => {
    event = { startDate: new Date('2019/12/25') };
    surcharge = { saturday: 20 };
    expect(applySurcharge(event, price, surcharge)).toEqual(20);
  });

  it('should apply 1st of May surcharge', () => {
    event = { startDate: new Date('2019/05/01') };
    surcharge = { firstOfMay: 10 };
    expect(applySurcharge(event, price, surcharge)).toEqual(22);
  });

  it('should not apply 1st of May surcharge', () => {
    event = { startDate: new Date('2019/05/01') };
    surcharge = { saturday: 10 };
    expect(applySurcharge(event, price, surcharge)).toEqual(20);
  });

  it('should apply holiday surcharge', () => {
    event = { startDate: new Date('2019/01/01') };
    surcharge = { publicHoliday: 15 };
    expect(applySurcharge(event, price, surcharge)).toEqual(23);
  });

  it('should not apply holiday surcharge', () => {
    event = { startDate: new Date('2019/01/01') };
    surcharge = { saturday: 10 };
    expect(applySurcharge(event, price, surcharge)).toEqual(20);
  });

  it('should apply saturday surcharge', () => {
    event = { startDate: new Date('2019/04/27') };
    surcharge = { saturday: 5 };
    expect(applySurcharge(event, price, surcharge)).toEqual(21);
  });

  it('should not apply saturday surcharge', () => {
    event = { startDate: new Date('2019/04/27') };
    surcharge = { sunday: 10 };
    expect(applySurcharge(event, price, surcharge)).toEqual(20);
  });

  it('should apply saturday surcharge', () => {
    event = { startDate: new Date('2019/04/28') };
    surcharge = { sunday: 5 };
    expect(applySurcharge(event, price, surcharge)).toEqual(21);
  });

  it('should not apply saturday surcharge', () => {
    event = { startDate: new Date('2019/04/28') };
    surcharge = { saturday: 10 };
    expect(applySurcharge(event, price, surcharge)).toEqual(20);
  });

  it('should not apply saturday surcharge', () => {
    event = { startDate: new Date('2019/04/28') };
    surcharge = { saturday: 10 };
    expect(applySurcharge(event, price, surcharge)).toEqual(20);
  });

  it('should apply holiday and not sunday surcharge', () => {
    event = { startDate: new Date('2019/07/14') };
    surcharge = { sunday: 10, publicHoliday: 20 };
    expect(applySurcharge(event, price, surcharge)).toEqual(24);
  });

  it('should apply evening surcharge', () => {
    event = { startDate: (new Date('2019/04/23')).setHours(18), endDate: (new Date('2019/04/23')).setHours(20) };
    surcharge = { evening: 10, eveningEndTime: '20:00', eveningStartTime: '18:00' };
    expect(applySurcharge(event, price, surcharge)).toEqual(22);
  });

  it('should not apply evening surcharge', () => {
    event = { startDate: (new Date('2019/04/23')).setHours(15), endDate: (new Date('2019/04/23')).setHours(17) };
    surcharge = { evening: 10, eveningEndTime: '20:00', eveningStartTime: '18:00' };
    expect(applySurcharge(event, price, surcharge)).toEqual(20);
  });

  it('should apply custom surcharge', () => {
    event = { startDate: (new Date('2019/04/23')).setHours(18), endDate: (new Date('2019/04/23')).setHours(20) };
    surcharge = { custom: 10, customEndTime: '20:00', customStartTime: '18:00' };
    expect(applySurcharge(event, price, surcharge)).toEqual(22);
  });

  it('should not apply custom surcharge', () => {
    event = { startDate: (new Date('2019/04/23')).setHours(15), endDate: (new Date('2019/04/23')).setHours(17) };
    surcharge = { custom: 10, customEndTime: '20:00', customStartTime: '18:00' };
    expect(applySurcharge(event, price, surcharge)).toEqual(20);
  });

  it('should apply custom surcharge ', () => {
    event = { startDate: (new Date('2019/04/23')).setHours(15), endDate: (new Date('2019/04/23')).setHours(17) };
    surcharge = {
      custom: 10,
      customEndTime: '20:00',
      customStartTime: '18:00',
      evening: 10,
      eveningEndTime: '12:00',
      eveningStartTime: '14:00',
    };
    expect(applySurcharge(event, price, surcharge)).toEqual(22);
  });
});

describe('getExclTaxes', () => {
  it('should return excluded taxes price', () => {
    expect(Number.parseFloat(getExclTaxes(20, 2).toFixed(2))).toEqual(19.61);
  });
});

describe('getInclTaxes', () => {
  it('should return excluded taxes price', () => {
    expect(getInclTaxes(20, 2)).toEqual(20.4);
  });
});

describe('getThirdPartyPayerPrice', () => {
  it('should compute tpp price', () => {
    expect(getThirdPartyPayerPrice(180, 10, 20)).toEqual(24);
  });
});

describe('getMatchingHistory', () => {
  it('should return history for once frequency', () => {
    const versionId = new ObjectID();
    const funding = { versionId, frequency: 'once', history: { fundingVersion: versionId, careHours: 2 } };
    const result = getMatchingHistory({}, funding);
    expect(result).toBeDefined();
    expect(result.fundingVersion).toEqual(versionId);
  });

  it('should return existing history for monthly frequency', () => {
    const versionId = new ObjectID();
    const funding = {
      versionId,
      frequency: 'monthly',
      history: [{ fundingVersion: versionId, careHours: 2, month: '03/2019' }, { fundingVersion: versionId, careHours: 4, month: '02/2019' }]
    };
    const event = { startDate: new Date('2019/03/12') };
    const result = getMatchingHistory(event, funding);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ fundingVersion: versionId, careHours: 2, month: '03/2019' });
  });

  it('should create history and add to list when missing for monthly frequency', () => {
    const versionId = new ObjectID();
    const funding = {
      versionId,
      frequency: 'monthly',
      history: [{ fundingVersion: versionId, careHours: 2, month: '01/2019' }, { fundingVersion: versionId, careHours: 4, month: '02/2019' }]
    };
    const event = { startDate: new Date('2019/03/12') };
    const result = getMatchingHistory(event, funding);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ careHours: 0, amountTTC: 0, fundingVersion: versionId, month: '03/2019' });
  });
});

describe('getHourlyFundingSplit', () => {
  const price = 50;
  const event = {
    startDate: (new Date('2019/03/12')).setHours(8),
    endDate: (new Date('2019/03/12')).setHours(10),
  };
  const service = { vat: 20 };

  it('case 1. Event fully invoiced to TPP', () => {
    const funding = {
      unitTTCRate: 21,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 20,
      history: { careHours: 1 },
      thirdPartyPayer: { _id: new ObjectID() },
    };

    const result = getHourlyFundingSplit(event, funding, service, price);
    expect(result).toBeDefined();
    expect(result.customerPrice).toEqual(22);
    expect(result.thirdPartyPayerPrice).toEqual(28);
    expect(result.history).toBeDefined();
    expect(result.history.careHours).toEqual(2);
  });

  it('case 2. Event partially invoiced to TPP', () => {
    const funding = {
      unitTTCRate: 21,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 20,
      history: { careHours: 3 },
      thirdPartyPayer: { _id: new ObjectID() },
    };

    const result = getHourlyFundingSplit(event, funding, service, price);
    expect(result).toBeDefined();
    expect(result.customerPrice).toEqual(36);
    expect(result.thirdPartyPayerPrice).toEqual(14);
    expect(result.history).toBeDefined();
    expect(result.history.careHours).toEqual(1);
  });
});

describe('getFixedFundingSplit', () => {
  const price = 50;
  const event = {
    startDate: (new Date('2019/03/12')).setHours(8),
    endDate: (new Date('2019/03/12')).setHours(10),
  };
  const service = { vat: 20 };

  it('Case 1. Event fully invoiced to TPP', () => {
    const funding = {
      history: { amountTTC: 10 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectID() },
    };

    const result = getFixedFundingSplit(event, funding, service, price);
    expect(result).toBeDefined();
    expect(result.customerPrice).toEqual(0);
    expect(result.thirdPartyPayerPrice).toEqual(50);
    expect(result.history).toBeDefined();
    expect(result.history.amountTTC).toEqual(60);
  });

  it('Case 2. Event partially invoiced to TPP', () => {
    const funding = {
      history: { amountTTC: 79 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectID() },
    };

    const result = getFixedFundingSplit(event, funding, service, price);
    expect(result).toBeDefined();
    expect(result.customerPrice).toEqual(32.5);
    expect(result.thirdPartyPayerPrice).toEqual(17.5);
    expect(result.history).toBeDefined();
    expect(result.history.amountTTC).toEqual(21);
  });
});

describe('getEventPrice', () => {
  const subscription = { unitTTCRate: 21 };
  const event = {
    startDate: (new Date('2019/05/08')).setHours(8),
    endDate: (new Date('2019/05/08')).setHours(10),
  };

  it('should return event prices wihtout funding and without surcharge', () => {
    const service = { vat: 20 };
    const result = getEventPrice(event, subscription, service);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ customerPrice: 35, thirdPartyPayerPrice: 0 });
  });

  it('should return event prices with surcharge', () => {
    const service = { vat: 20, nature: 'hourly', surcharge: { publicHoliday: 10 } };
    const result = getEventPrice(event, subscription, service);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ customerPrice: 38.5, thirdPartyPayerPrice: 0 });
  });

  it('should return event prices with hourly funding', () => {
    const service = { vat: 20 };
    const funding = {
      nature: 'hourly',
      unitTTCRate: 15,
      careHours: 4,
      frequency: 'once',
      customerParticipationRate: 0,
      history: { careHours: 1 },
      thirdPartyPayer: { _id: new ObjectID() },
    };
    const result = getEventPrice(event, subscription, service, funding);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ customerPrice: 10, thirdPartyPayerPrice: 25 });
  });

  it('should return event prices with fixed funding', () => {
    const service = { vat: 20 };
    const funding = {
      nature: 'fixed',
      history: { amountTTC: 50 },
      amountTTC: 100,
      thirdPartyPayer: { _id: new ObjectID() },
    };
    const result = getEventPrice(event, subscription, service, funding);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ customerPrice: 0, thirdPartyPayerPrice: 35 });
  });
});

describe('formatDraftBillsForCustomer', () => {
  const customerPrices = { exclTaxes: 20, inclTaxes: 25, hours: 3, eventsList: [{ event: '123456' }] };
  const event = {
    _id: 'abc',
    startDate: (new Date('2019/05/08')).setHours(8),
    endDate: (new Date('2019/05/08')).setHours(10),
  };
  const service = { vat: 20 };

  it('should format bill for customer without tpp info', () => {
    const eventPrice = { customerPrice: 17.5 };
    const result = formatDraftBillsForCustomer(customerPrices, event, eventPrice, service);
    expect(result).toBeDefined();
    expect(result).toMatchObject({
      eventsList: [
        { event: '123456' },
        { event: 'abc', inclTaxesCustomer: 21, exclTaxesCustomer: 17.5 }
      ],
      hours: 5,
      exclTaxes: 37.5,
      inclTaxes: 46,
    });
  });

  it('should format bill for customer with tpp info', () => {
    const eventPrice = { customerPrice: 17.5, thirdPartyPayerPrice: 12.5, thirdPartyPayer: 'tpp' };
    const result = formatDraftBillsForCustomer(customerPrices, event, eventPrice, service);
    expect(result).toBeDefined();
    expect(result).toMatchObject({
      eventsList: [
        { event: '123456' },
        {
          event: 'abc',
          inclTaxesCustomer: 21,
          exclTaxesCustomer: 17.5,
          exclTaxesTpp: 12.5,
          inclTaxesTpp: 15,
          thirdPartyPayer: 'tpp',
        },
      ],
      hours: 5,
      exclTaxes: 37.5,
      inclTaxes: 46,
    });
  });
});

describe('formatDraftBillsForTPP', () => {
  it('should format bill for tpp', () => {
    const tppId = new ObjectID();
    const tpp = { _id: tppId };
    const tppPrices = {
      [tppId]: { exclTaxes: 20, inclTaxes: 25, hours: 3, eventsList: [{ event: '123456' }] }
    };
    const event = {
      _id: 'abc',
      startDate: (new Date('2019/05/08')).setHours(8),
      endDate: (new Date('2019/05/08')).setHours(10),
    };
    const eventPrice = {
      customerPrice: 17.5,
      thirdPartyPayerPrice: 12.5,
      thirdPartyPayer: tppId,
      history: {},
      chargedTime: 120,
    };
    const service = { vat: 20 };

    const result = formatDraftBillsForTPP(tppPrices, tpp, event, eventPrice, service);
    expect(result).toBeDefined();
    expect(result[tppId]).toBeDefined();
    expect(result[tppId].exclTaxes).toEqual(32.5);
    expect(result[tppId].inclTaxes).toEqual(40);
    expect(result[tppId].hours).toEqual(5);
    expect(result[tppId].eventsList).toMatchObject([
      { event: '123456' },
      {
        event: 'abc',
        inclTaxesTpp: 15,
        exclTaxesTpp: 12.5,
        thirdPartyPayer: tppId,
        inclTaxesCustomer: 21,
        exclTaxesCustomer: 17.5,
      }
    ]);
  });
});

describe('getDraftBillsPerSubscription', () => {
  const events = [
    { _id: 1, startDate: new Date('2019/02/15').setHours(8), endDate: new Date('2019/02/15').setHours(10) },
    { _id: 2, startDate: new Date('2019/01/15').setHours(8), endDate: new Date('2019/01/15').setHours(10) },
  ];
  const customer = {};
  const subscription = {
    versions: [{ startDate: new Date('2019/01/01'), unitTTCRate: 21 }],
    service: {
      versions: [{ startDate: new Date('2019/01/01'), vat: 20 }],
    },
  };
  const query = {
    billingStartDate: new Date('2019/02/01'),
  };

  it('should return draft bill without tpp', () => {
    const fundings = [];
    const result = getDraftBillsPerSubscription(events, customer, subscription, fundings, query);
    expect(result).toBeDefined();
    expect(result.customer).toBeDefined();
    expect(moment(result.customer.startDate).format('DD/MM/YYYY')).toEqual('15/01/2019');
    expect(result.customer.exclTaxes).toEqual(70);
    expect(result.customer.inclTaxes).toEqual(84);
  });

  it('should return draft bill with tpp', () => {
    const tppId = new ObjectID();
    const fundings = [
      {
        thirdPartyPayer: { _id: tppId },
        versions: [{
          _id: 'version',
          careDays: [1, 4, 5],
          startDate: new Date('2019/01/01'),
          frequency: 'once',
          nature: 'fixed',
          amountTTC: 200,
          history: { amountTTC: 185 },
        }],
      },
      {
        thirdPartyPayer: { _id: new ObjectID() },
        versions: [{
          _id: 'version2',
          careDays: [0],
          startDate: new Date('2019/01/01'),
          frequency: 'once',
          nature: 'fixed',
          amountTTC: 200,
          history: { amountTTC: 185 },
        }],
      },
    ];
    const result = getDraftBillsPerSubscription(events, customer, subscription, fundings, query);
    expect(result).toBeDefined();
    expect(result.customer).toBeDefined();
    expect(moment(result.customer.startDate).format('DD/MM/YYYY')).toEqual('15/01/2019');
    expect(result.customer.exclTaxes).toEqual(57.5);
    expect(result.customer.inclTaxes).toEqual(69);
    expect(result.thirdPartyPayer).toBeDefined();
    expect(result.thirdPartyPayer[tppId].exclTaxes).toEqual(12.5);
    expect(result.thirdPartyPayer[tppId].inclTaxes).toEqual(15);
  });
});
