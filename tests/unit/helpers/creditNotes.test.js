const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
const FundingHistory = require('../../../models/FundingHistory');
const Event = require('../../../models/Event');
const CreditNoteHelper = require('../../../helpers/creditNotes');
const UtilsHelper = require('../../../helpers/utils');
const moment = require('moment');

describe('updateEventAndFundingHistory', () => {
  let findOneAndUpdate = null;
  let find = null;
  let save = null;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(FundingHistory, 'findOneAndUpdate');
    find = sinon.stub(Event, 'find');
    save = sinon.stub(Event.prototype, 'save');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
    find.restore();
    save.restore();
  });

  it('should increment history for hourly and once funding', async () => {
    const fundingVersionId = new ObjectID();
    const events = [
      new Event({
        bills: { nature: 'hourly', fundingVersion: fundingVersionId, thirdPartyPayer: new ObjectID(), careHours: 3 },
        startDate: new Date('2019/01/19')
      }),
    ];

    find.returns(events);
    findOneAndUpdate.returns(null);

    await CreditNoteHelper.updateEventAndFundingHistory([], false);
    sinon.assert.callCount(findOneAndUpdate, 2);
    sinon.assert.calledWith(
      findOneAndUpdate.firstCall,
      { fundingVersion: fundingVersionId, month: '01/2019' },
      { $inc: { careHours: -3 } }
    );
    sinon.assert.calledWith(
      findOneAndUpdate.secondCall,
      { fundingVersion: fundingVersionId },
      { $inc: { careHours: -3 } }
    );
  });

  it('should increment history for hourly and monthly funding', async () => {
    const fundingVersionId = new ObjectID();
    const events = [
      new Event({
        bills: { nature: 'hourly', fundingVersion: fundingVersionId, thirdPartyPayer: new ObjectID(), careHours: 3 },
        startDate: new Date('2019/01/19')
      }),
    ];

    find.returns(events);
    findOneAndUpdate.returns(new FundingHistory());

    await CreditNoteHelper.updateEventAndFundingHistory([], false);
    sinon.assert.callCount(findOneAndUpdate, 1);
    sinon.assert.calledWith(
      findOneAndUpdate,
      { fundingVersion: fundingVersionId, month: '01/2019' },
      { $inc: { careHours: -3 } }
    );
  });

  it('should decrement history for hourly and monthly funding', async () => {
    const fundingVersionId = new ObjectID();
    const events = [
      new Event({
        bills: { nature: 'hourly', fundingVersion: fundingVersionId, thirdPartyPayer: new ObjectID(), careHours: 3 },
        startDate: new Date('2019/01/19')
      }),
    ];

    find.returns(events);
    findOneAndUpdate.returns(null);

    await CreditNoteHelper.updateEventAndFundingHistory([], true);
    sinon.assert.callCount(findOneAndUpdate, 2);
    sinon.assert.calledWith(
      findOneAndUpdate.firstCall,
      { fundingVersion: fundingVersionId, month: '01/2019' },
      { $inc: { careHours: 3 } }
    );
  });

  it('should increment history for fixed and once funding', async () => {
    const fundingVersionId = new ObjectID();
    const events = [
      new Event({
        bills: { nature: 'fixed', fundingVersion: fundingVersionId, thirdPartyPayer: new ObjectID(), inclTaxesTpp: 666 },
        startDate: new Date('2019/01/19')
      }),
    ];

    find.returns(events);
    findOneAndUpdate.returns(new FundingHistory());

    await CreditNoteHelper.updateEventAndFundingHistory([], false);
    sinon.assert.callCount(findOneAndUpdate, 1);
    sinon.assert.calledWith(
      findOneAndUpdate,
      { fundingVersion: fundingVersionId },
      { $inc: { amountTTC: -666 } }
    );
  });
});

describe('formatPDF', () => {
  let getMatchingVersion;
  let formatPrice;
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion').returns({ name: 'Toto' });
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
  });

  afterEach(() => {
    getMatchingVersion.restore();
    formatPrice.restore();
  });

  it('should format correct credit note PDF with events for customer', () => {
    const subId = new ObjectID();
    const creditNote = {
      number: 1,
      events: [{
        auxiliary: {
          identity: { firstname: 'Nathanaelle', lastname: 'Tata' }
        },
        startDate: '2019-04-29T06:00:00.000Z',
        endDate: '2019-04-29T15:00:00.000Z',
        subscription: subId,
        bills: { inclTaxesCustomer: 234, exclTaxesCustomer: 221 },
      }],
      customer: {
        identity: { firstname: 'Toto', lastname: 'Bobo', title: 'Lolo' },
        contact: { address: { fullAddress: 'La ruche' } },
        subscriptions: [{ _id: subId, service: { versions: [{ name: 'Toto' }] } }],
      },
      date: '2019-04-29T22:00:00.000Z',
      exclTaxesCustomer: 221,
      inclTaxesCustomer: 234,
      exclTaxesTpp: 21,
      inclTaxesTpp: 34,
    };

    const expectedResult = {
      creditNote: {
        number: 1,
        customer: {
          identity: { firstname: 'Toto', lastname: 'Bobo', title: 'Lolo' },
          contact: { address: { fullAddress: 'La ruche' } },
        },
        date: moment('2019-04-29T22:00:00.000Z').format('DD/MM/YYYY'),
        exclTaxes: '221,00 €',
        inclTaxes: '234,00 €',
        totalVAT: '13,00 €',
        formattedEvents: [{
          identity: 'N. Tata',
          date: moment('2019-04-29T06:00:00.000Z').format('DD/MM'),
          startTime: moment('2019-04-29T06:00:00.000Z').format('HH:mm'),
          endTime: moment('2019-04-29T15:00:00.000Z').format('HH:mm'),
          service: 'Toto',
        }],
        recipient: {
          name: 'Lolo Toto Bobo',
          address: { fullAddress: 'La ruche' },
        },
        company: {},
        logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png'
      }
    };

    formatPrice.onCall(0).returns('13,00 €');
    formatPrice.onCall(1).returns('221,00 €');
    formatPrice.onCall(2).returns('234,00 €');

    const result = CreditNoteHelper.formatPDF(creditNote, {});

    expect(result).toEqual(expectedResult);
  });

  it('should format correct credit note PDF with events for tpp', () => {
    const subId = new ObjectID();
    const creditNote = {
      number: 1,
      events: [{
        auxiliary: {
          identity: { firstname: 'Nathanaelle', lastname: 'Tata' }
        },
        startDate: '2019-04-29T06:00:00.000Z',
        endDate: '2019-04-29T15:00:00.000Z',
        subscription: subId,
        bills: { inclTaxesTpp: 234, exclTaxesTpp: 221 },
      }],
      customer: {
        identity: { firstname: 'Toto', lastname: 'Bobo', title: 'Lolo' },
        contact: { address: { fullAddress: 'La ruche' } },
        subscriptions: [{ _id: subId, service: { versions: [{ name: 'Toto' }] } }],
      },
      date: '2019-04-29T22:00:00.000Z',
      exclTaxesTpp: 21,
      inclTaxesTpp: 34,
      exclTaxesCustomer: 221,
      inclTaxesCustomer: 234,
      thirdPartyPayer: { name: 'tpp', address: { fullAddress: 'j\'habite ici' } }
    };

    const expectedResult = {
      creditNote: {
        number: 1,
        customer: {
          identity: { firstname: 'Toto', lastname: 'Bobo', title: 'Lolo' },
          contact: { address: { fullAddress: 'La ruche' } },
        },
        date: moment('2019-04-29T22:00:00.000Z').format('DD/MM/YYYY'),
        exclTaxes: '21,00 €',
        inclTaxes: '34,00 €',
        totalVAT: '13,00 €',
        formattedEvents: [{
          identity: 'N. Tata',
          date: moment('2019-04-29T06:00:00.000Z').format('DD/MM'),
          startTime: moment('2019-04-29T06:00:00.000Z').format('HH:mm'),
          endTime: moment('2019-04-29T15:00:00.000Z').format('HH:mm'),
          service: 'Toto',
        }],
        recipient: {
          name: 'tpp',
          address: { fullAddress: 'j\'habite ici' },
        },
        company: {},
        logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png'
      }
    };

    formatPrice.onCall(0).returns('13,00 €');
    formatPrice.onCall(1).returns('21,00 €');
    formatPrice.onCall(2).returns('34,00 €');

    const result = CreditNoteHelper.formatPDF(creditNote, {});

    expect(result).toBeDefined();
    expect(result).toEqual(expectedResult);
  });

  it('should format correct credit note PDF with subscription', () => {
    const creditNote = {
      number: 1,
      subscription: {
        service: 'service',
        unitInclTaxes: 12,
      },
      customer: {
        identity: { firstname: 'Toto', lastname: 'Bobo', title: 'Lolo' },
        contact: { address: { fullAddress: 'La ruche' } },
      },
      date: '2019-04-29T22:00:00.000Z',
      exclTaxesTpp: 21,
      inclTaxesTpp: 34,
      exclTaxesCustomer: 221,
      inclTaxesCustomer: 234,
      thirdPartyPayer: { name: 'tpp', address: { fullAddress: 'j\'habite ici' } }
    };

    formatPrice.onCall(0).returns('12,00 €');

    const result = CreditNoteHelper.formatPDF(creditNote, {});

    expect(result).toBeDefined();
    expect(result.creditNote.subscription).toBeDefined();
    expect(result.creditNote.subscription.service).toBe('service');
    expect(result.creditNote.subscription.unitInclTaxes).toBe('12,00 €');
  });
});
