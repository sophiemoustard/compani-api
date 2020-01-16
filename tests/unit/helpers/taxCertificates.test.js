const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const TaxCertificateHelper = require('../../../src/helpers/taxCertificates');
const PdfHelper = require('../../../src/helpers/pdf');
const UtilsHelper = require('../../../src/helpers/utils');
const TaxCertificate = require('../../../src/models/TaxCertificate');

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

describe('formatPdf', () => {
  let formatIdentity;
  beforeEach(() => {
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
  });
  afterEach(() => {
    formatIdentity.restore();
  });

  it('should return formatted data for pdf generation', async () => {
    const company = {
      name: 'Alenvi',
      rcs: 'rcs',
      address: { fullAddress: '10 rue des cathédrales 75007 Paris' },
      logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png',
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

    formatIdentity.returns('Mr Patate');

    const result = TaxCertificateHelper.formatPdf(taxCertificate, company);

    expect(result).toEqual({
      taxCertificate: {
        company: { logo: company.logo, address: company.address, name: company.name },
        year: '2019',
        date: '31/01/2020',
        director: 'Clément de Saint Olive',
        customer: { name: 'Mr Patate', address: taxCertificate.customer.contact.primaryAddress },
      },
    });
    sinon.assert.calledWithExactly(formatIdentity, taxCertificate.customer.identity, 'TFL');
  });
});

describe('generateTaxCertificatePdf', () => {
  let generatePdf;
  let TaxCertificateMock;
  let formatPdf;
  beforeEach(() => {
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
    TaxCertificateMock = sinon.mock(TaxCertificate);
    formatPdf = sinon.stub(TaxCertificateHelper, 'formatPdf');
  });
  afterEach(() => {
    generatePdf.restore();
    TaxCertificateMock.restore();
    formatPdf.restore();
  });

  it('should generate pdf', async () => {
    const taxCertificateId = new ObjectID();
    const credentials = { company: { _id: new ObjectID() } };
    const taxCertificate = { _id: taxCertificateId, year: '2019' };
    generatePdf.returns('pdf');
    TaxCertificateMock.expects('findOne')
      .withExactArgs({ _id: taxCertificateId })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity contact' })
      .chain('lean')
      .withExactArgs()
      .once()
      .returns(taxCertificate);
    formatPdf.returns('data');

    const result = await TaxCertificateHelper.generateTaxCertificatePdf(taxCertificateId, credentials);

    sinon.assert.calledWithExactly(formatPdf, taxCertificate, credentials.company);
    sinon.assert.calledWithExactly(generatePdf, 'data', './src/data/taxCertificates.html');
    expect(result).toEqual('pdf');
    TaxCertificateMock.verify();
  });
});
