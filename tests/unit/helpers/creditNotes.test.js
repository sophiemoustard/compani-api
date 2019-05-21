const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
const FundingHistory = require('../../../models/FundingHistory');
const Event = require('../../../models/Event');
const CreditNoteHelper = require('../../../helpers/creditNotes');
const moment = require('moment');
const UtilsHelper = require('../../../helpers/utils');

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
  it('should format correct credit note PDF', () => {
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
        bills: { inclTaxesCustomer: 234, exclTaxesCustomer: 221.8009478672986 },
      }],
      customer: {
        identity: { firstname: 'Toto' },
        contact: { address: {} },
        subscriptions: [{ _id: subId, service: { versions: [{ startDate: '2019-01-01', name: 'Toto' }] } }],
      },
      date: '2019-04-29T22:00:00.000Z',
      exclTaxesCustomer: 221.8009478672986,
      inclTaxesCustomer: 234,
      exclTaxesTpp: 0,
      inclTaxesTpp: 0,
    };

    const expectedResult = {
      creditNote: {
        number: 1,
        customer: {
          identity: { firstname: 'Toto' },
          contact: { address: {} },
        },
        date: moment('2019-04-29T22:00:00.000Z').format('DD/MM/YYYY'),
        exclTaxesCustomer: '221,80 €',
        inclTaxesCustomer: '234,00 €',
        totalExclTaxes: '221,80 €',
        totalVAT: '12,20 €',
        totalInclTaxes: '234,00 €',
        formattedEvents: [{
          identity: 'N. Tata',
          date: moment('2019-04-29T06:00:00.000Z').format('DD/MM'),
          startTime: moment('2019-04-29T06:00:00.000Z').format('HH:mm'),
          endTime: moment('2019-04-29T15:00:00.000Z').format('HH:mm'),
          service: 'Toto',
        }],
        company: {},
        logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png'
      }
    };

    const result = CreditNoteHelper.formatPDF(creditNote, {});

    expect(result).toEqual(expectedResult);
  });
});
