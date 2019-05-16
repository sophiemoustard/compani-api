const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
const FundingHistory = require('../../../models/FundingHistory');
const Event = require('../../../models/Event');
const { updateEventAndFundingHistory, formatPDF } = require('../../../helpers/creditNotes');

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

    await updateEventAndFundingHistory([], false);
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

    await updateEventAndFundingHistory([], false);
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

    await updateEventAndFundingHistory([], true);
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

    await updateEventAndFundingHistory([], false);
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
    const creditNote = {
      events: [{
        auxiliary: {
          identity: { firstname: 'Nathanaelle' }
        },
        startDate: '2019-04-29T06:00:00.000Z',
        endDate: '2019-04-29T15:00:00.000Z',
        bills: { inclTaxesCustomer: 234, exclTaxesCustomer: 221.8009478672986 },
      }],
      date: '2019-04-29T22:00:00.000Z',
      startDate: '2019-03-31T22:00:00.000Z',
      endDate: '2019-05-30T22:00:00.000Z',
      exclTaxesCustomer: 221.8009478672986,
      inclTaxesCustomer: 234,
      exclTaxesTpp: 0,
      inclTaxesTpp: 0,
    };
    const company = {};
    const result = {
      creditNote: {
        events: [{
          auxiliary: {
            identity: { firstname: 'N' },
          },
          startDate: '2019-04-29T06:00:00.000Z',
          endDate: '2019-04-29T15:00:00.000Z',
          bills: { inclTaxesCustomer: 234, exclTaxesCustomer: 221.8009478672986 },
          date: '29/04',
          startTime: '08:00',
          endTime: '17:00'
        }],
        date: '30/04/2019',
        startDate: '2019-03-31T22:00:00.000Z',
        endDate: '2019-05-30T22:00:00.000Z',
        exclTaxesCustomer: '221,80 €',
        inclTaxesCustomer: '234,00 €',
        exclTaxesTpp: 0,
        inclTaxesTpp: 0,
        totalExclTaxes: '221,80 €',
        totalVAT: '12,20 €',
        totalInclTaxes: '234,00 €',
        formattedEvents: [{
          auxiliary: {
            identity: { firstname: 'N' }
          },
          startDate: '2019-04-29T06:00:00.000Z',
          endDate: '2019-04-29T15:00:00.000Z',
          bills: { inclTaxesCustomer: 234, exclTaxesCustomer: 221.8009478672986 },
          date: '29/04',
          startTime: '08:00',
          endTime: '17:00'
        }],
        company: {},
        logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png'
      }
    };
    expect(formatPDF(creditNote, company)).toEqual(expect.objectContaining(result));
  });
});
