const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const TaxCertificatePdf = require('../../../src/data/pdf/taxCertificates/taxCertificates');

describe('getPdfContent', () => {
  let downloadImages;

  beforeEach(() => {
    downloadImages = sinon.stub(FileHelper, 'downloadImages');
  });

  afterEach(() => {
    downloadImages.restore();
  });

  it('it should format and return pdf content', async () => {
    const taxCertificate = {
      totalHours: '60,25h',
      totalPaid: '8 888,88 €',
      cesu: 0,
      subscriptions: 'Temps de qualité - autonomie',
      interventions: [
        {
          auxiliary: 'Nino Ferreira',
          serialNumber: 'NF010101010101',
          subscription: 'Temps de qualité - autonomie',
          month: 'janvier',
          hours: '37,00h',
        },
        {
          auxiliary: 'Chloé Mölkky',
          serialNumber: 'CM010101010101',
          subscription: 'Temps de qualité - autonomie',
          month: 'décembre',
          hours: '2,00h',
        },
      ],
      company: {
        logo: 'https://storage.googleapis.com/bucket-kfc/skusku.png',
        name: 'Compakenni SAS',
        address: { fullAddress: '24 Avenue du Test 75012 Paris' },
        rcs: '111 222 333',
        legalRepresentative: { name: 'Clément SACRÉ TOM', position: 'Directeur général' },
      },
      year: '2020',
      date: '29/01/2021',
      customer: {
        name: 'Mme Maoui Lin',
        address: { fullAddress: '65 Rue du test 92230 Issy-les-Moulineaux' },
      },
    };

    const tableBody = [
      [
        { text: 'Matricule', bold: true },
        { text: 'Intervenant', bold: true },
        { text: 'Mois', bold: true },
        { text: 'Heures', bold: true },
        { text: 'Prestation', bold: true },
      ],
      [
        'NF010101010101',
        'Nino Ferreira',
        'Janvier',
        { text: '37,00h', alignment: 'right' },
        'Temps de qualité - autonomie',
      ],
      [
        'CM010101010101',
        'Chloé Mölkky',
        'Décembre',
        { text: '2,00h', alignment: 'right' },
        'Temps de qualité - autonomie',
      ],
      [
        '',
        '',
        { text: 'Total', bold: true },
        { text: '60,25h', bold: true, alignment: 'right' },
        '',
      ],
    ];

    const pdf = {
      content: [
        { image: 'src/data/pdf/tmp/skusku.png', width: 132, marginBottom: 24 },
        { text: 'Compakenni SAS', bold: true, marginBottom: 8, fontSize: 12 },
        {
          columns: [
            [
              { text: 'RCS : 111 222 333', fontSize: 12 },
              { text: '24 Avenue du Test 75012 Paris', fontSize: 12 },
            ],
            [
              { text: 'Mme Maoui Lin', fontSize: 12 },
              { text: '65 Rue du test 92230 Issy-les-Moulineaux', fontSize: 12 },
            ],
          ],
          marginBottom: 40,
        },
        {
          table: {
            headerRows: 0,
            widths: ['*'],
            body: [[{
              text: 'ATTESTATION DESTINEE AU CENTRE DES IMPOTS POUR L\'ANNEE 2020',
              alignment: 'center',
              fontSize: 14,
              bold: true,
            }]],
          },
          marginBottom: 24,
        },
        {
          text: 'Je soussigné(e) Clément SACRÉ TOM, Directeur général de Compakenni SAS,'
          + ' certifie que Mme Maoui Lin (65 Rue du test 92230 Issy-les-Moulineaux)'
          + ' a bénéficié d\'une aide à domicile.\n\n',
        },
        { text: 'Nature des interventions : Temps de qualité - autonomie.\n\n' },
        {
          text: 'Montant total des interventions effectivement acquitté ouvrant droit à réduction ou crédit'
          + ' d\'impôt : 8 888,88 €',
        },
        { text: '', marginBottom: 24 },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
          layout: { hLineWidth() { return 0.5; }, vLineWidth() { return 0.5; } },
          marginBottom: 24,
        },
        {
          text: 'Les sommes que vous auriez perçues sur votre compte pour financer l\'aide à domicile sont à'
          + ' déduire de la valeur indiquée précédemment. Votre déclaration n\'engage que votre responsabilité de'
          + ' contribuable.\n\n',
        },
        {
          text: '* Pour les personnes utilisant le Chèque emploi service universel, seul le montant que vous'
          + ' avez personnellement financé est déductible (article 199 sexdecies du Code général des impôts et'
           + ' article L7233-7 du code du travail). Une attestation vous sera délivrée par les établissements qui'
          + ' préfinancent le Cesu.\n\n',
        },
        {
          text: 'Le client doit conserver à fin de contrôle, les factures remises par le prestataire de services,'
          + ' qui précisent les dates et durées des interventions.\n\n',
        },
        { text: 'Fait pour valoir ce que de droit,' },
        { text: '29/01/2021', alignment: 'right' },
        { text: 'Clément SACRÉ TOM', alignment: 'right' },
        { text: 'Directeur général', alignment: 'right' },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 11, alignment: 'justify' },
    };

    downloadImages.returns(['src/data/pdf/tmp/skusku.png']);

    const result = await TaxCertificatePdf.getPdfContent({ taxCertificate });

    expect(JSON.stringify(result)).toBe(JSON.stringify(pdf));
    sinon.assert.calledOnceWithExactly(
      downloadImages,
      [{ url: 'https://storage.googleapis.com/bucket-kfc/skusku.png', name: 'logo.png' }]
    );
  });
});
