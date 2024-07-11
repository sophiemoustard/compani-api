const { expect } = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const Bill = require('../../../src/models/Bill');
const Company = require('../../../src/models/Company');
const BillHelper = require('../../../src/helpers/bills');
const UtilsHelper = require('../../../src/helpers/utils');
const PdfHelper = require('../../../src/helpers/pdf');
const BillPdf = require('../../../src/data/pdf/billing/bill');
const SinonMongoose = require('../sinonMongoose');
const { FIXED, HOURLY, ONCE, MONTHLY } = require('../../../src/helpers/constants');

describe('getUnitInclTaxes', () => {
  let getMatchingVersion;
  let getLastVersion;
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
  });
  afterEach(() => {
    getMatchingVersion.restore();
    getLastVersion.restore();
  });

  it('should return unitInclTaxes from subscription if no client', () => {
    const bill = {};
    const subscription = { unitInclTaxes: 20 };
    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe('20');
    sinon.assert.notCalled(getLastVersion);
  });

  it('should return 0 if no matching funding found', () => {
    const tppId = new ObjectId();
    const bill = {
      thirdPartyPayer: { _id: tppId },
      customer: { fundings: [{ thirdPartyPayer: new ObjectId(), versions: [{ startDate: '2022-09-10T00:00:00' }] }] },
      createdAt: '2022-09-12T09:09:09',
    };
    const subscription = { unitInclTaxes: 20, events: [{ startDate: '2022-01-24T09:00:00' }] };
    getMatchingVersion.returns({ thirdPartyPayer: tppId, startDate: '2022-09-10T00:00:00' });
    getLastVersion.returns({ startDate: '2022-01-24T09:00:00' });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBe('0');
    sinon.assert.calledOnceWithExactly(getLastVersion, [{ startDate: '2022-01-24T09:00:00' }], 'startDate');
    sinon.assert.calledOnceWithExactly(
      getMatchingVersion,
      '2022-09-12T09:09:09',
      bill.customer.fundings[0],
      'createdAt',
      BillHelper.filterFundingVersion
    );
  });

  it('should return subscription unitInclTaxes for FIXED funding', () => {
    const tppId = new ObjectId();
    const bill = {
      thirdPartyPayer: { _id: tppId },
      customer: { fundings: [{ thirdPartyPayer: tppId, nature: 'fixed', versions: [{ amountTTC: 14.4 }] }] },
      createdAt: '2022-09-12T09:09:09',
    };
    const subscription = { vat: 20, unitInclTaxes: 12, events: [{ startDate: '2022-01-24T09:00:00' }] };
    getMatchingVersion.returns({
      thirdPartyPayer: tppId,
      nature: FIXED,
      amountTTC: 14.4,
      startDate: '2022-01-24T00:00:00',
      createdAt: '2022-01-17T13:59:23',
    });
    getLastVersion.returns({ startDate: '2022-01-24T09:00:00' });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBeDefined();
    expect(result).toBe('12');
    sinon.assert.calledOnceWithExactly(getLastVersion, [{ startDate: '2022-01-24T09:00:00' }], 'startDate');
    sinon.assert.calledOnceWithExactly(
      getMatchingVersion,
      '2022-09-12T09:09:09',
      bill.customer.fundings[0],
      'createdAt',
      BillHelper.filterFundingVersion
    );
  });

  it('should return unit incl taxes from funding if HOURLY funding', () => {
    const tppId = new ObjectId();
    const bill = {
      thirdPartyPayer: { _id: tppId },
      customer: {
        fundings: [
          {
            thirdPartyPayer: tppId,
            nature: 'hourly',
            versions: [
              { unitTTCRate: 18, startDate: '2022-01-23T00:00:00', createdAt: '2022-01-13T13:59:23' },
              { unitTTCRate: 24, startDate: '2022-01-24T00:00:00', createdAt: '2022-01-17T13:59:23' },
            ],
          },
          {
            thirdPartyPayer: tppId,
            nature: 'hourly',
            versions: [{
              unitTTCRate: 10,
              startDate: '2022-01-21T00:00:00',
              endDate: '2022-01-22T22:59:59',
              createdAt: '2022-01-13T13:59:23',
            }],
          },
        ],
      },
      createdAt: '2022-09-12T09:09:09',
    };
    const subscription = {
      vat: 20,
      events: [{ startDate: '2022-01-24T09:00:00' }, { startDate: '2022-01-25T09:00:00' }],
    };

    getLastVersion.returns({ startDate: '2022-01-25T09:00:00' });
    getMatchingVersion.returns({
      thirdPartyPayer: tppId,
      nature: 'hourly',
      unitTTCRate: 24,
      customerParticipationRate: 25,
      startDate: '2022-01-24T00:00:00',
      createdAt: '2022-01-17T13:59:23',
    });

    const result = BillHelper.getUnitInclTaxes(bill, subscription);

    expect(result).toBe('18');
    sinon.assert.calledOnceWithExactly(
      getLastVersion,
      [{ startDate: '2022-01-24T09:00:00' }, { startDate: '2022-01-25T09:00:00' }],
      'startDate'
    );
    sinon.assert.calledTwice(getMatchingVersion);
    sinon.assert.calledWithExactly(
      getMatchingVersion.getCall(0),
      '2022-09-12T09:09:09',
      bill.customer.fundings[0],
      'createdAt',
      BillHelper.filterFundingVersion
    );
    sinon.assert.calledWithExactly(
      getMatchingVersion.getCall(1),
      '2022-09-12T09:09:09',
      bill.customer.fundings[1],
      'createdAt',
      BillHelper.filterFundingVersion
    );
  });
});

describe('computeSurcharge', () => {
  it('should compute surcharges on an entire event', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectId(),
        startDate: '2019-09-15T05:00:00.000+00:00',
        endDate: '2019-09-15T07:00:00.000+00:00',
        surcharges: [{ _id: new ObjectId(), percentage: 25, name: 'Dimanche' }],
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual('12.235');
  });

  it('should compute surcharges on a part of an event', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectId(),
        startDate: '2019-09-15T19:00:00.000+00:00',
        endDate: '2019-09-15T21:15:00.000+00:00',
        surcharges: [{
          _id: new ObjectId(),
          startHour: '2019-09-15T20:00:00.000+00:00',
          endHour: '2019-09-15T21:15:15.000+00:00',
          percentage: 25,
          name: 'Soirée',
        }],
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual('7.672364583333333333353725');
  });

  it('should not compute totalSurcharges if there is no surcharge in a subscription', () => {
    const subscription = {
      unitInclTaxes: 24.47,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
      events: [{
        _id: new ObjectId(),
        startDate: '2019-09-15T05:00:00.000+00:00',
        endDate: '2019-09-15T07:00:00.000+00:00',
      }],
    };

    const totalSurcharge = BillHelper.computeSurcharge(subscription);

    expect(totalSurcharge).toEqual('0');
  });
});

describe('formatBillDetailsForPdf', () => {
  let getUnitInclTaxes;
  let computeSurcharge;
  let formatPrice;
  let formatHour;
  let computeExclTaxesWithDiscount;
  beforeEach(() => {
    getUnitInclTaxes = sinon.stub(BillHelper, 'getUnitInclTaxes');
    computeSurcharge = sinon.stub(BillHelper, 'computeSurcharge');
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
    formatHour = sinon.stub(UtilsHelper, 'formatHour');
    computeExclTaxesWithDiscount = sinon.stub(UtilsHelper, 'computeExclTaxesWithDiscount');
  });
  afterEach(() => {
    getUnitInclTaxes.restore();
    computeSurcharge.restore();
    formatPrice.restore();
    formatHour.restore();
    computeExclTaxesWithDiscount.restore();
  });

  it('should return formatted details if service.nature is hourly', () => {
    const bill = {
      netInclTaxes: 440.46,
      subscriptions: [{
        unitInclTaxes: 24.47,
        vat: 5.5,
        service: { name: 'Temps de qualité - autonomie', nature: 'hourly' },
        hours: 18,
        exclTaxes: 430.5444,
        inclTaxes: 440.46,
        discount: 0,
      }],
    };

    getUnitInclTaxes.returns('24.47');
    formatHour.onCall(0).returns('18,00 h');
    computeSurcharge.returns(0);
    formatPrice.onCall(0).returns('430,54 €');
    formatPrice.onCall(1).returns('23,68 €');
    computeExclTaxesWithDiscount.returns('430.5444');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [{
        unitInclTaxes: '24.47',
        vat: 5.5,
        name: 'Temps de qualité - autonomie',
        volume: '18,00 h',
        total: '440.46',
      }],
      totalExclTaxes: '430,54 €',
      totalVAT: '23,68 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
  });

  it('should return formatted details if service.nature is fixed with billing items', () => {
    const bill = {
      netInclTaxes: 50,
      subscriptions: [{
        unitInclTaxes: 22,
        vat: 5.5,
        service: { name: 'Forfait nuit', nature: 'fixed' },
        hours: 0,
        exclTaxes: 20.3,
        inclTaxes: 22,
        discount: 5,
        events: [{
          _id: new ObjectId(),
          startDate: '2019-09-15T05:00:00.000+00:00',
          endDate: '2019-09-15T07:00:00.000+00:00',
          surcharges: [{ _id: new ObjectId(), percentage: 25, name: 'Dimanche' }],
        }],
      }],
      billingItemList: [
        {
          name: 'Frais de dossier',
          unitInclTaxes: 30,
          count: 1,
          inclTaxes: 30,
          exclTaxes: 27.27,
          discount: 10,
          vat: 10,
        },
        {
          name: 'Equipement de protection individuel',
          unitInclTaxes: 2,
          count: 5,
          inclTaxes: 10,
          exclTaxes: 8.33,
          discount: 0,
          vat: 15,
        },
      ],
    };

    getUnitInclTaxes.returns('22');
    computeSurcharge.returns('12.24');
    formatPrice.onCall(0).returns('20,30 €');
    formatPrice.onCall(1).returns('1,70 €');
    computeExclTaxesWithDiscount.onCall(0).returns('15.560664');
    computeExclTaxesWithDiscount.onCall(1).returns('18.179091');
    computeExclTaxesWithDiscount.onCall(2).returns('8.33');

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [
        { unitInclTaxes: '22', vat: 5.5, name: 'Forfait nuit', volume: 1, total: '22' },
        { name: 'Majorations', total: '12.24' },
        { name: 'Frais de dossier', unitInclTaxes: '30', volume: '1', total: '30', vat: 10 },
        { name: 'Equipement de protection individuel', unitInclTaxes: '2', volume: '5', total: '10', vat: 15 },
        { name: 'Remises', total: -15 },
        { name: 'Prise en charge du/des tiers(s) payeur(s)', total: '-9.24' },
      ],
      totalExclTaxes: '20,30 €',
      totalVAT: '1,70 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
    sinon.assert.notCalled(formatHour);
  });

  it('should return formatted details if service.nature is hourly and funding is fixed (for Tpp)', () => {
    const subscriptionId = new ObjectId();
    const tppId = new ObjectId();
    const bill = {
      netInclTaxes: 341,
      forTpp: true,
      customer: {
        _id: new ObjectId(),
        identity: { title: 'mrs', firstname: 'Super', lastname: 'Test' },
        fundings: [
          {
            nature: FIXED,
            subscription: subscriptionId,
            thirdPartyPayer: tppId,
            frequency: ONCE,
            _id: new ObjectId(),
          },
        ],
      },
      thirdPartyPayer: {
        _id: tppId,
        address: {
          street: '21 Avenue du Général de Gaulle',
          fullAddress: '21 Avenue du Général de Gaulle 94000 Créteil',
          zipCode: '94000',
          city: 'Créteil',
        },
        name: 'Conseil Départemental du Val de Marne - APA- Direction de l\'autonomie',
        isUsedInFundings: true,
      },
      subscriptions: [{
        _id: new ObjectId(),
        subscription: subscriptionId,
        unitInclTaxes: 22,
        vat: 5.5,
        service: { name: 'Temps de qualité - autonomie ', nature: HOURLY },
        hours: 15,
        exclTaxes: 312.8,
        inclTaxes: 330,
        discount: 0,
        events: [{
          _id: new ObjectId(),
          startDate: '2019-09-15T05:00:00.000+00:00',
          endDate: '2019-09-15T07:00:00.000+00:00',
          surcharges: [{ _id: new ObjectId(), percentage: 25, name: 'Dimanche' }],
        }],
      }],
    };

    getUnitInclTaxes.returns('22');
    formatHour.returns('15,00 h');
    computeSurcharge.returns(11);
    formatPrice.onCall(0).returns('323,22 €');
    formatPrice.onCall(1).returns('17,78 €');
    computeExclTaxesWithDiscount.returns(312.8);

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [
        { unitInclTaxes: '22', vat: 5.5, name: 'Temps de qualité - autonomie ', volume: '15,00 h', total: '330' },
        { name: 'Majorations', total: '11' },
      ],
      totalExclTaxes: '323,22 €',
      totalVAT: '17,78 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
    sinon.assert.calledOnceWithExactly(formatHour, 15);
    sinon.assert.calledOnceWithExactly(computeExclTaxesWithDiscount, 330, 0, 5.5);
    sinon.assert.calledOnceWithExactly(getUnitInclTaxes, bill, bill.subscriptions[0]);
  });

  it('should return formatted details if service.nature is hourly and funding is hourly (for Tpp)', () => {
    const subscriptionId = new ObjectId();
    const tppId = new ObjectId();
    const bill = {
      netInclTaxes: 50,
      forTpp: true,
      customer: {
        _id: new ObjectId(),
        identity: { title: 'mrs', firstname: 'Super', lastname: 'Test' },
        fundings: [
          {
            nature: HOURLY,
            subscription: subscriptionId,
            thirdPartyPayer: tppId,
            frequency: MONTHLY,
            _id: new ObjectId(),
          },
        ],
      },
      thirdPartyPayer: {
        _id: tppId,
        address: {
          street: '21 Avenue du Général de Gaulle',
          fullAddress: '21 Avenue du Général de Gaulle 94000 Créteil',
          zipCode: '94000',
          city: 'Créteil',
        },
        name: 'Conseil Départemental du Val de Marne - APA- Direction de l\'autonomie',
        isUsedInFundings: true,
      },
      subscriptions: [{
        _id: new ObjectId(),
        subscription: subscriptionId,
        unitInclTaxes: 22,
        vat: 5.5,
        service: { name: 'Temps de qualité - autonomie ', nature: HOURLY },
        hours: 15,
        exclTaxes: 47.39,
        inclTaxes: 50,
        discount: 0,
        events: [{
          _id: new ObjectId(),
          startDate: '2019-09-15T05:00:00.000+00:00',
          endDate: '2019-09-15T07:00:00.000+00:00',
          surcharges: [],
        }],
      }],
    };

    getUnitInclTaxes.returns('22');
    formatHour.returns('15,00 h');
    computeSurcharge.returns(0);
    formatPrice.onCall(0).returns('50,00 €');
    formatPrice.onCall(1).returns('2,61 €');
    computeExclTaxesWithDiscount.returns(47.39);

    const formattedBillDetails = BillHelper.formatBillDetailsForPdf(bill);

    expect(formattedBillDetails).toEqual({
      formattedDetails: [
        { unitInclTaxes: '22', vat: 5.5, name: 'Temps de qualité - autonomie ', volume: '15,00 h', total: '50' },
      ],
      totalExclTaxes: '50,00 €',
      totalVAT: '2,61 €',
    });

    sinon.assert.calledOnceWithExactly(computeSurcharge, bill.subscriptions[0]);
    sinon.assert.calledOnceWithExactly(formatHour, 15);
    sinon.assert.calledOnceWithExactly(computeExclTaxesWithDiscount, 50, 0, 5.5);
    sinon.assert.calledOnceWithExactly(getUnitInclTaxes, bill, bill.subscriptions[0]);
  });
});

describe('formatEventsForPdf', () => {
  let formatEventSurchargesForPdf;
  beforeEach(() => {
    formatEventSurchargesForPdf = sinon.stub(PdfHelper, 'formatEventSurchargesForPdf');
  });
  afterEach(() => {
    formatEventSurchargesForPdf.restore();
  });

  it('should returns an empty array if no events provided', () => {
    const service = { name: 'Temps de qualité - autonomie' };
    const formattedEvents = BillHelper.formatEventsForPdf([], service);
    expect(formattedEvents).toEqual([]);
  });

  it('should returns formatted events', () => {
    const events = [{
      auxiliary: {
        identity: { firstname: 'Nathanaelle', lastname: 'Tata' },
      },
      startDate: moment('2019-04-10T08:00:00').toDate(),
      endDate: moment('2019-04-10T10:00:00').toDate(),
      bills: { inclTaxesCustomer: 52, exclTaxesCustomer: 49.28909952606635 },
      surcharges: [],
    }];
    const service = { name: 'Temps de qualité - autonomie' };

    const formattedEvents = BillHelper.formatEventsForPdf(events, service);

    expect(formattedEvents).toEqual([{
      date: '10/04',
      endTime: '10:00',
      identity: 'N. Tata',
      service: 'Temps de qualité - autonomie',
      startTime: '08:00',
    }]);
  });
});

describe('formatPdf', () => {
  let formatEventsForPdf;
  let formatBillDetailsForPdf;
  let formatIdentity;
  beforeEach(() => {
    formatEventsForPdf = sinon.stub(BillHelper, 'formatEventsForPdf');
    formatBillDetailsForPdf = sinon.stub(BillHelper, 'formatBillDetailsForPdf');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    formatEventsForPdf.returns(['hello']);
  });
  afterEach(() => {
    formatEventsForPdf.restore();
    formatBillDetailsForPdf.restore();
    formatIdentity.restore();
  });

  it('should format correct bill pdf for customer', () => {
    formatBillDetailsForPdf.returns({
      formattedSubs: [{ vat: '5,5' }],
      totalExclTaxes: '1 018,01 €',
      totalVAT: '55,99 €',
    });
    formatIdentity.returns('Maya l\' abeille');

    const company = {
      name: 'Alcatraz',
      logo: 'company_logo',
      rcs: 'rcs',
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

    const bill = {
      number: '12345',
      subscriptions: [{
        events: [{}],
        startDate: '2019-03-31T22:00:00.000Z',
        endDate: '2019-04-30T21:59:59.999Z',
        unitInclTaxes: 24.644549763033176,
        vat: 5.5,
        hours: 40,
        exclTaxes: 1018.009,
        inclTaxes: 1074,
        service: { name: 'Temps de qualité - autonomie' },
      }],
      customer: {
        identity: { title: 'mr', firstname: 'Donald', lastname: 'Duck' },
        contact: { primaryAddress: { fullAddress: 'La ruche' } },
      },
      netInclTaxes: 1074,
      date: '2019-04-30T21:59:59.999Z',
    };

    const expectedResult = {
      bill: {
        number: '12345',
        customer: {
          identity: { title: 'M.', firstname: 'Donald', lastname: 'Duck' },
          contact: { primaryAddress: { fullAddress: 'La ruche' } },
        },
        formattedSubs: [{ vat: '5,5' }],
        recipient: { name: 'Maya l\' abeille', address: { fullAddress: 'La ruche' } },
        netInclTaxes: '1 074,00 €',
        date: '30/04/2019',
        totalExclTaxes: '1 018,01 €',
        totalVAT: '55,99 €',
        formattedEvents: ['hello'],
        company,
        forTpp: false,
      },
    };

    const result = BillHelper.formatPdf(bill, company);

    expect(result).toEqual(expectedResult);
    sinon.assert.calledWithExactly(
      formatEventsForPdf,
      bill.subscriptions[0].events,
      bill.subscriptions[0].service
    );
    sinon.assert.calledWithExactly(formatIdentity, bill.customer.identity, 'TFL');
  });

  it('should format correct bill pdf for third party payer', () => {
    formatBillDetailsForPdf.returns({
      formattedSubs: [{ vat: '5,5' }],
      totalExclTaxes: '1 018,01 €',
      totalVAT: '55,99 €',
    });

    const company = {
      name: 'Alcatraz',
      logo: 'company_logo',
      rcs: 'rcs',
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

    const bill = {
      number: '12345',
      subscriptions: [{
        events: [{
          auxiliary: {
            identity: { firstname: 'Nathanaelle', lastname: 'Tata' },
          },
          startDate: '2019-04-10T06:00:00.000Z',
          endDate: '2019-04-10T08:00:00.000Z',
          bills: { inclTaxesCustomer: 52, exclTaxesCustomer: 49 },
        }],
        startDate: '2019-03-31T22:00:00.000Z',
        endDate: '2019-04-30T21:59:59.999Z',
        unitExclTaxes: 24.644549763033176,
        vat: 5.5,
        hours: 40,
        exclTaxes: 1018.009,
        inclTaxes: 1074,
        service: { name: 'Temps de qualité - autonomie' },
      }],
      customer: {
        identity: { title: 'mr', firstname: 'Donald', lastname: 'Duck' },
        contact: { primaryAddress: { fullAddress: 'La ruche' } },
      },
      thirdPartyPayer: {
        name: 'tpp',
        address: { fullAddress: 'j\'habite ici' },
      },
      netInclTaxes: 1074,
      date: '2019-04-30T21:59:59.999Z',
      forTpp: true,
    };

    const expected = {
      bill: {
        number: '12345',
        customer: {
          identity: { title: 'M.', firstname: 'Donald', lastname: 'Duck' },
          contact: { primaryAddress: { fullAddress: 'La ruche' } },
        },
        formattedSubs: [{
          vat: '5,5',
        }],
        recipient: {
          name: 'tpp',
          address: { fullAddress: 'j\'habite ici' },
        },
        netInclTaxes: '1 074,00 €',
        date: '30/04/2019',
        totalExclTaxes: '1 018,01 €',
        totalVAT: '55,99 €',
        formattedEvents: ['hello'],
        company,
        forTpp: true,
      },
    };

    const result = BillHelper.formatPdf(bill, company);

    expect(result).toEqual(expected);
    sinon.assert.notCalled(formatIdentity);
  });
});

describe('generateBillPdf', async () => {
  let formatPdf;
  let findOneBill;
  let findOneCompany;
  let getPdf;
  beforeEach(() => {
    formatPdf = sinon.stub(BillHelper, 'formatPdf');
    findOneBill = sinon.stub(Bill, 'findOne');
    findOneCompany = sinon.stub(Company, 'findOne');
    getPdf = sinon.stub(BillPdf, 'getPdf');
  });
  afterEach(() => {
    formatPdf.restore();
    findOneBill.restore();
    findOneCompany.restore();
    getPdf.restore();
  });

  it('should generate pdf', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const bill = { _id: new ObjectId(), number: 'number' };
    findOneBill.returns(SinonMongoose.stubChainedQueries(bill));
    findOneCompany.returns(SinonMongoose.stubChainedQueries(credentials.company, ['lean']));
    formatPdf.returns({ data: 'data' });
    getPdf.returns({ pdf: 'pdf' });

    const result = await BillHelper.generateBillPdf({ _id: bill._id }, credentials);

    expect(result).toEqual({ billNumber: bill.number, pdf: { pdf: 'pdf' } });
    sinon.assert.calledWithExactly(formatPdf, bill, credentials.company);
    sinon.assert.calledOnceWithExactly(getPdf, { data: 'data' });
    SinonMongoose.calledOnceWithExactly(findOneBill, [
      { query: 'findOne', args: [{ _id: bill._id, origin: 'compani' }] },
      { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name address' }] },
      { query: 'populate', args: [{ path: 'customer', select: '_id identity contact fundings' }] },
      { query: 'populate', args: [{ path: 'subscriptions.events.auxiliary', select: 'identity' }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledOnceWithExactly(findOneCompany, [
      {
        query: 'findOne',
        args: [{ _id: companyId }, { rcs: 1, rna: 1, address: 1, logo: 1, name: 1, 'customersConfig.billFooter': 1 }],
      },
      { query: 'lean' },
    ]);
  });
});
