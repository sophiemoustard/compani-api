const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const TaxCertificateHelper = require('../../../src/helpers/taxCertificates');
const PdfHelper = require('../../../src/helpers/pdf');
const UtilsHelper = require('../../../src/helpers/utils');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const EventRepository = require('../../../src/repositories/EventRepository');
const PaymentRepository = require('../../../src/repositories/PaymentRepository');

require('sinon-mongoose');

describe('generateTaxCertificatesList', () => {
  let TaxCertificateMock;
  beforeEach(() => {
    TaxCertificateMock = sinon.mock(TaxCertificate);
  });
  afterEach(() => {
    TaxCertificateMock.restore();
  });
  it('should return tax certificates list', async () => {
    const taxCertificates = [
      { _id: new ObjectID() },
      { _id: new ObjectID() },
    ];
    const companyId = new ObjectID();
    const customer = new ObjectID();

    TaxCertificateMock.expects('find')
      .withExactArgs({ customer, company: companyId })
      .chain('lean')
      .once()
      .returns(taxCertificates);

    const result = await TaxCertificateHelper.generateTaxCertificatesList(customer, { company: { _id: companyId } });

    expect(result).toEqual(taxCertificates);
    TaxCertificateMock.verify();
  });
});

describe('formatInterventions', () => {
  let populateService;
  let formatIdentity;
  let formatHour;
  beforeEach(() => {
    populateService = sinon.stub(SubscriptionsHelper, 'populateService');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    formatHour = sinon.stub(UtilsHelper, 'formatHour');
  });
  afterEach(() => {
    populateService.restore();
    formatIdentity.restore();
    formatHour.restore();
  });

  it('should format interventions', () => {
    const interventions = [
      {
        auxiliary: { identity: { lastname: 'lastname' } },
        month: '9',
        duration: 12,
        subscription: { service: { name: 'Temps de qualité' } },
      },
      {
        auxiliary: { identity: { lastname: 'firstname' } },
        month: '5',
        duration: 13,
        subscription: { service: { name: 'Temps de partage' } },
      },
    ];
    formatIdentity.returns('toto');
    formatHour.onCall(0).returns('12,00h');
    formatHour.onCall(1).returns('13,00h');
    populateService.returnsArg(0);

    const result = TaxCertificateHelper.formatInterventions(interventions);
    expect(result).toEqual([
      { auxiliary: 'toto', subscription: 'Temps de qualité', month: 'septembre', hours: '12,00h' },
      { auxiliary: 'toto', subscription: 'Temps de partage', month: 'mai', hours: '13,00h' },
    ]);
    sinon.assert.calledWithExactly(populateService.getCall(0), { name: 'Temps de qualité' });
    sinon.assert.calledWithExactly(populateService.getCall(1), { name: 'Temps de partage' });
    sinon.assert.calledWithExactly(formatHour.getCall(0), 12);
    sinon.assert.calledWithExactly(formatHour.getCall(1), 13);
    sinon.assert.calledWithExactly(formatIdentity.getCall(0), { lastname: 'lastname' }, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(1), { lastname: 'firstname' }, 'FL');
  });
});

describe('formatPdf', () => {
  let formatIdentity;
  let formatInterventions;
  let formatPrice;
  beforeEach(() => {
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    formatInterventions = sinon.stub(TaxCertificateHelper, 'formatInterventions');
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
  });
  afterEach(() => {
    formatIdentity.restore();
    formatInterventions.restore();
    formatPrice.restore();
  });

  it('should return formatted data for pdf generation', async () => {
    const company = {
      name: 'Alenvi',
      rcs: 'rcs',
      address: { fullAddress: '10 rue des cathédrales 75007 Paris' },
      logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png',
      legalRepresentative: { lastname: 'Trebalag', firstname: 'Jean Christophe', position: 'master' },
    };
    const taxCertificate = {
      customer: {
        identity: { title: 'mr', lastname: 'leboncoin' },
        contact: {
          primaryAddress: {
            street: '37 rue de Ponthieu',
            zipCode: '75008',
            city: 'Paris',
            fullAddress: '37 rue de Ponthieu 75008 Paris',
            location: { type: 'Point', coordinates: [2.0987, 1.2345] },
          },
        },
      },
      year: '2019',
    };
    const interventions = [
      { auxiliary: { identity: { lastname: 'lastname' } }, month: '9', duration: 12 },
      { auxiliary: { identity: { lastname: 'firstname' } }, month: '5', duration: 13 },
    ];
    const payments = { paid: 1200, cesu: 500 };

    formatIdentity.onCall(0).returns('Jean Christophe TREBALAG');
    formatIdentity.onCall(1).returns('Mr Patate');
    formatInterventions.returns([{ subscription: 'Forfait nuit' }, { subscription: 'Forfait jour' }]);
    formatPrice.onCall(0).returns('1 700,00€');
    formatPrice.onCall(1).returns('500,00€');

    const result = TaxCertificateHelper.formatPdf(taxCertificate, company, interventions, payments);

    expect(result).toEqual({
      taxCertificate: {
        cesu: '500,00€',
        totalPaid: '1 700,00€',
        totalHours: '25,00h',
        interventions: [{ subscription: 'Forfait nuit' }, { subscription: 'Forfait jour' }],
        subscriptions: 'Forfait nuit, Forfait jour',
        company: {
          logo: company.logo,
          address: company.address,
          name: company.name,
          rcs: 'rcs',
          legalRepresentative: { name: 'Jean Christophe TREBALAG', position: 'master' },
        },
        year: '2019',
        date: '31/01/2020',
        customer: { name: 'Mr Patate', address: taxCertificate.customer.contact.primaryAddress },
      },
    });
    sinon.assert.calledWithExactly(formatIdentity.getCall(0), company.legalRepresentative, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(1), taxCertificate.customer.identity, 'TFL');
    sinon.assert.calledWithExactly(formatInterventions, interventions);
    sinon.assert.calledWithExactly(formatPrice.getCall(0), 1700);
    sinon.assert.calledWithExactly(formatPrice.getCall(1), 500);
  });
});

describe('generateTaxCertificatePdf', () => {
  let generatePdf;
  let TaxCertificateMock;
  let formatPdf;
  let getTaxCertificateInterventions;
  let getTaxCertificatesPayments;
  beforeEach(() => {
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
    TaxCertificateMock = sinon.mock(TaxCertificate);
    formatPdf = sinon.stub(TaxCertificateHelper, 'formatPdf');
    getTaxCertificateInterventions = sinon.stub(EventRepository, 'getTaxCertificateInterventions');
    getTaxCertificatesPayments = sinon.stub(PaymentRepository, 'getTaxCertificatesPayments');
  });
  afterEach(() => {
    generatePdf.restore();
    TaxCertificateMock.restore();
    formatPdf.restore();
    getTaxCertificateInterventions.restore();
    getTaxCertificatesPayments.restore();
  });

  it('should generate pdf', async () => {
    const taxCertificateId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const taxCertificate = { _id: taxCertificateId, year: '2019' };
    generatePdf.returns('pdf');
    TaxCertificateMock.expects('findOne')
      .withExactArgs({ _id: taxCertificateId })
      .chain('populate')
      .withExactArgs({
        path: 'customer',
        select: 'identity contact subscriptions',
        populate: { path: 'subscriptions.service' },
      })
      .chain('lean')
      .withExactArgs()
      .once()
      .returns(taxCertificate);
    formatPdf.returns('data');
    getTaxCertificateInterventions.returns(['interventions']);
    getTaxCertificatesPayments.returns({ paid: 1200, cesu: 500 });

    const result = await TaxCertificateHelper.generateTaxCertificatePdf(taxCertificateId, credentials);

    sinon.assert.calledWithExactly(
      formatPdf,
      taxCertificate,
      credentials.company,
      ['interventions'],
      { paid: 1200, cesu: 500 }
    );
    sinon.assert.calledWithExactly(generatePdf, 'data', './src/data/taxCertificates.html');
    sinon.assert.calledWithExactly(getTaxCertificateInterventions, taxCertificate, companyId);
    expect(result).toEqual('pdf');
    TaxCertificateMock.verify();
  });
});
