const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const TaxCertificateHelper = require('../../../src/helpers/taxCertificates');
const PdfHelper = require('../../../src/helpers/pdf');
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

describe('generateTaxCertificatePdf', () => {
  let generatePdf;
  beforeEach(() => {
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
  });
  afterEach(() => {
    generatePdf.restore();
  });

  it('should generate pdf', async () => {
    generatePdf.returns('pdf');

    const result = await TaxCertificateHelper.generateTaxCertificatePdf();

    sinon.assert.calledWithExactly(generatePdf, {}, './src/data/taxCertificates.html');
    expect(result).toEqual('pdf');
  });
});
