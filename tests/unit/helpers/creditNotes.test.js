const { ObjectId } = require('mongodb');
const Boom = require('@hapi/boom');
const { expect } = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const CreditNote = require('../../../src/models/CreditNote');
const Company = require('../../../src/models/Company');
const CreditNoteHelper = require('../../../src/helpers/creditNotes');
const UtilsHelper = require('../../../src/helpers/utils');
const translate = require('../../../src/helpers/translate');
const PdfHelper = require('../../../src/helpers/pdf');
const CreditNotePdf = require('../../../src/data/pdf/billing/creditNote');
const { COMPANI, OGUST } = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

const { language } = translate;

describe('formatPdf', () => {
  let getMatchingVersion;
  let formatPrice;
  let formatEventSurchargesForPdf;
  let formatIdentity;
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion').returns({ name: 'Toto' });
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    formatEventSurchargesForPdf = sinon.stub(PdfHelper, 'formatEventSurchargesForPdf');
  });
  afterEach(() => {
    getMatchingVersion.restore();
    formatPrice.restore();
    formatEventSurchargesForPdf.restore();
    formatIdentity.restore();
  });

  it('should format correct credit note pdf with events for customer', () => {
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
    const subId = new ObjectId();
    const creditNote = {
      number: 1,
      events: [{
        auxiliary: { identity: { firstname: 'Nathanaelle', lastname: 'Tata' } },
        startDate: '2019-04-29T06:00:00.000Z',
        endDate: '2019-04-29T15:00:00.000Z',
        serviceName: 'Toto',
        bills: { inclTaxesCustomer: 234, exclTaxesCustomer: 221, surcharges: [{ percentage: 30 }] },
      }],
      customer: {
        identity: { firstname: 'Toto', lastname: 'Bobo', title: 'mr' },
        contact: { primaryAddress: { fullAddress: 'La ruche' } },
        subscriptions: [{ _id: subId, service: { versions: [{ name: 'Toto' }] } }],
      },
      date: '2019-04-29T22:00:00.000Z',
      exclTaxesCustomer: 221,
      inclTaxesCustomer: 234,
      exclTaxesTpp: 0,
      inclTaxesTpp: 0,
    };
    const expectedResult = {
      creditNote: {
        number: 1,
        customer: {
          identity: { firstname: 'Toto', lastname: 'Bobo', title: 'M.' },
          contact: { primaryAddress: { fullAddress: 'La ruche' } },
        },
        forTpp: false,
        date: moment('2019-04-29T22:00:00.000Z').format('DD/MM/YYYY'),
        totalExclTaxes: '221,00 €',
        netInclTaxes: '234,00 €',
        totalVAT: '13,00 €',
        formattedEvents: [
          {
            identity: 'N. Tata',
            date: moment('2019-04-29T06:00:00.000Z').format('DD/MM'),
            startTime: moment('2019-04-29T06:00:00.000Z').format('HH:mm'),
            endTime: moment('2019-04-29T15:00:00.000Z').format('HH:mm'),
            service: 'Toto',
            surcharges: [{ percentage: 30, startHour: '19h' }],
          },
        ],
        recipient: { name: 'M. Toto BOBO', address: { fullAddress: 'La ruche' } },
        company,
      },
    };

    formatPrice.onCall(0).returns('13,00 €');
    formatPrice.onCall(1).returns('221,00 €');
    formatPrice.onCall(2).returns('234,00 €');
    formatIdentity.returns('M. Toto BOBO');
    formatEventSurchargesForPdf.returns([{ percentage: 30, startHour: '19h' }]);

    const result = CreditNoteHelper.formatPdf(creditNote, company);

    expect(result).toEqual(expectedResult);
    sinon.assert.calledWithExactly(formatPrice.getCall(0), '13');
    sinon.assert.calledWithExactly(formatPrice.getCall(1), 221);
    sinon.assert.calledWithExactly(formatPrice.getCall(2), 234);
    sinon.assert.calledOnceWithExactly(formatEventSurchargesForPdf, [{ percentage: 30 }]);
  });

  it('should format correct credit note pdf with events for tpp', () => {
    const subId = new ObjectId();
    const creditNote = {
      number: 1,
      events: [{
        auxiliary: {
          identity: { firstname: 'Nathanaelle', lastname: 'Tata' },
        },
        startDate: '2019-04-29T06:00:00.000Z',
        endDate: '2019-04-29T15:00:00.000Z',
        serviceName: 'Toto',
        bills: { inclTaxesTpp: 234, exclTaxesTpp: 221 },
      }],
      customer: {
        identity: { firstname: 'Toto', lastname: 'Bobo', title: 'mrs' },
        contact: { primaryAddress: { fullAddress: 'La ruche' } },
        subscriptions: [{ _id: subId, service: { versions: [{ name: 'Toto' }] } }],
      },
      date: '2019-04-29T22:00:00.000Z',
      exclTaxesTpp: 21,
      inclTaxesTpp: 34,
      exclTaxesCustomer: 220,
      inclTaxesCustomer: 234,
      thirdPartyPayer: { name: 'tpp', address: { fullAddress: 'j\'habite ici' } },
    };
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
    const expectedResult = {
      creditNote: {
        number: 1,
        customer: {
          identity: { firstname: 'Toto', lastname: 'Bobo', title: 'Mme' },
          contact: { primaryAddress: { fullAddress: 'La ruche' } },
        },
        forTpp: true,
        date: moment('2019-04-29T22:00:00.000Z').format('DD/MM/YYYY'),
        totalExclTaxes: '21,00 €',
        netInclTaxes: '34,00 €',
        totalVAT: '13,00 €',
        formattedEvents: [
          {
            identity: 'N. Tata',
            date: moment('2019-04-29T06:00:00.000Z').format('DD/MM'),
            startTime: moment('2019-04-29T06:00:00.000Z').format('HH:mm'),
            endTime: moment('2019-04-29T15:00:00.000Z').format('HH:mm'),
            service: 'Toto',
          },
        ],
        recipient: { name: 'tpp', address: { fullAddress: 'j\'habite ici' } },
        company,
      },
    };

    formatPrice.onCall(0).returns('13,00 €');
    formatPrice.onCall(1).returns('21,00 €');
    formatPrice.onCall(2).returns('34,00 €');

    const result = CreditNoteHelper.formatPdf(creditNote, company);

    expect(result).toBeDefined();
    expect(result).toEqual(expectedResult);
    sinon.assert.calledWithExactly(formatPrice.getCall(0), '13');
    sinon.assert.calledWithExactly(formatPrice.getCall(1), 21);
    sinon.assert.calledWithExactly(formatPrice.getCall(2), 34);
    sinon.assert.notCalled(formatEventSurchargesForPdf);
  });

  it('should format correct credit note pdf with subscription', () => {
    const creditNote = {
      number: 1,
      subscription: { service: { name: 'service' }, unitInclTaxes: 12 },
      customer: {
        identity: { firstname: 'Toto', lastname: 'Bobo', title: 'couple' },
        contact: { primaryAddress: { fullAddress: 'La ruche' } },
      },
      date: '2019-04-29T22:00:00.000Z',
      exclTaxesTpp: 21,
      inclTaxesTpp: 34,
      exclTaxesCustomer: 221,
      inclTaxesCustomer: 234,
      thirdPartyPayer: { name: 'tpp', address: { fullAddress: 'j\'habite ici' } },
    };
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
    formatPrice.onCall(0).returns('12,00 €');

    const result = CreditNoteHelper.formatPdf(creditNote, company);

    expect(result).toBeDefined();
    expect(result.creditNote.subscription).toBeDefined();
    expect(result.creditNote.subscription.service).toBe('service');
    expect(result.creditNote.subscription.unitInclTaxes).toBe('12,00 €');
  });

  it('should format correct credit note pdf with billing items', () => {
    const creditNote = {
      number: 1,
      billingItemList: [
        { name: 'Billing Murray', unitInclTaxes: 25, vat: 10, count: 2, inclTaxes: 50, exclTaxes: 48 },
        { name: 'Billing Burr', unitInclTaxes: 50, vat: 10, count: 1, inclTaxes: 50, exclTaxes: 48 },
      ],
      customer: {
        identity: { firstname: 'Toto', lastname: 'Bobo', title: 'couple' },
        contact: { primaryAddress: { fullAddress: 'La ruche' } },
      },
      date: '2019-04-29T22:00:00.000Z',
      exclTaxesTpp: 21,
      inclTaxesTpp: 34,
      exclTaxesCustomer: 221,
      inclTaxesCustomer: 234,
      thirdPartyPayer: { name: 'tpp', address: { fullAddress: 'j\'habite ici' } },
    };
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

    formatPrice.onCall(0).returns('4,00 €');
    formatPrice.onCall(1).returns('96,00 €');
    formatPrice.onCall(2).returns('100,00 €');

    const result = CreditNoteHelper.formatPdf(creditNote, company);

    expect(result).toBeDefined();
    expect(result.creditNote.billingItems).toEqual([
      { name: 'Billing Murray', unitInclTaxes: 25, vat: 10, count: 2, inclTaxes: 50 },
      { name: 'Billing Burr', unitInclTaxes: 50, vat: 10, count: 1, inclTaxes: 50 },
    ]);
  });
});

describe('generateCreditNotePdf', () => {
  let creditNoteFindOne;
  let companyNoteFindOne;
  let formatPdf;
  let getPdf;

  const params = { _id: new ObjectId() };
  const credentials = { company: { _id: new ObjectId() } };
  beforeEach(() => {
    creditNoteFindOne = sinon.stub(CreditNote, 'findOne');
    companyNoteFindOne = sinon.stub(Company, 'findOne');
    formatPdf = sinon.stub(CreditNoteHelper, 'formatPdf');
    getPdf = sinon.stub(CreditNotePdf, 'getPdf');
  });

  afterEach(() => {
    creditNoteFindOne.restore();
    companyNoteFindOne.restore();
    formatPdf.restore();
    getPdf.restore();
  });

  it('should generate a pdf', async () => {
    creditNoteFindOne.returns(SinonMongoose.stubChainedQueries({ origin: COMPANI, number: '12345' }));
    companyNoteFindOne.returns(SinonMongoose.stubChainedQueries({ _id: credentials.company._id }, ['lean']));
    formatPdf.returns({ name: 'creditNotePdf' });
    getPdf.returns({ title: 'creditNote' });

    const result = await CreditNoteHelper.generateCreditNotePdf(params, credentials);

    expect(result).toEqual({ pdf: { title: 'creditNote' }, creditNoteNumber: '12345' });
    SinonMongoose.calledOnceWithExactly(
      creditNoteFindOne,
      [
        { query: 'findOne', args: [{ _id: params._id }] },
        {
          query: 'populate',
          args: [{
            path: 'customer',
            select: '_id identity contact subscriptions',
            populate: { path: 'subscriptions.service' },
          }],
        },
        { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name address' }] },
        { query: 'populate', args: [{ path: 'events.auxiliary', select: 'identity' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      companyNoteFindOne,
      [{ query: 'findOne', args: [{ _id: credentials.company._id }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      formatPdf,
      { origin: COMPANI, number: '12345' },
      { _id: credentials.company._id }
    );
    sinon.assert.calledOnceWithExactly(getPdf, { name: 'creditNotePdf' });
  });

  it('should return a 404 if creditnote is not found', async () => {
    try {
      creditNoteFindOne.returns(SinonMongoose.stubChainedQueries(null));

      await CreditNoteHelper.generateCreditNotePdf(params, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].creditNoteNotFound));
    } finally {
      sinon.assert.notCalled(formatPdf);
      sinon.assert.notCalled(getPdf);
      SinonMongoose.calledOnceWithExactly(
        creditNoteFindOne,
        [
          { query: 'findOne', args: [{ _id: params._id }] },
          {
            query: 'populate',
            args: [{
              path: 'customer',
              select: '_id identity contact subscriptions',
              populate: { path: 'subscriptions.service' },
            }],
          },
          { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name address' }] },
          { query: 'populate', args: [{ path: 'events.auxiliary', select: 'identity' }] },
          { query: 'lean' },
        ]
      );
    }
  });

  it('should return a 400 if creditnote origin is not compani', async () => {
    try {
      creditNoteFindOne.returns(SinonMongoose.stubChainedQueries({ origin: OGUST }));

      await CreditNoteHelper.generateCreditNotePdf(params, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest(translate[language].creditNoteNotCompani));
    } finally {
      sinon.assert.notCalled(formatPdf);
      sinon.assert.notCalled(getPdf);
      SinonMongoose.calledOnceWithExactly(
        creditNoteFindOne,
        [
          { query: 'findOne', args: [{ _id: params._id }] },
          {
            query: 'populate',
            args: [{
              path: 'customer',
              select: '_id identity contact subscriptions',
              populate: { path: 'subscriptions.service' },
            }],
          },
          { query: 'populate', args: [{ path: 'thirdPartyPayer', select: '_id name address' }] },
          { query: 'populate', args: [{ path: 'events.auxiliary', select: 'identity' }] },
          { query: 'lean' },
        ]
      );
    }
  });
});
