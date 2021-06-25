const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const Bill = require('../../../src/data/pdf/billing/bill');

describe('getPdfContent', () => {
  let downloadImages;

  beforeEach(() => {
    downloadImages = sinon.stub(FileHelper, 'downloadImages');
  });

  afterEach(() => {
    downloadImages.restore();
  });

  it('it should format and return pdf content', async () => {
    const paths = [
      'src/data/pdf/tmp/logo.png',
    ];

    const formattedEvents = [
      {
        identity: 'G. TEST',
        date: '01/04',
        startTime: '11:30',
        endTime: '13:30',
        service: 'Temps de qualité - autonomie',
        surcharges: [],
      },
      {
        identity: 'G. TEST',
        date: '02/04',
        startTime: '12:00',
        endTime: '14:00',
        service: 'Temps de qualité - autonomie',
        surcharges: [{ _id: '608053dd562eab001560c2b6', percentage: 25, name: 'Dimanche' }],
      },
    ];
    const data = {
      bill: {
        number: 'FACT-101042100271',
        customer: {
          identity: { title: 'M.', lastname: 'TERIEUR', firstname: 'Alain' },
          contact: {
            primaryAddress: {
              fullAddress: '124 Avenue Daumesnil 75012 Paris',
              street: '124 Avenue Daumesnil',
              city: 'Paris',
              zipCode: '75012',
            },
            accessCodes: 'au fond du Kawaa',
            phone: '',
            others: '',
          },
        },
        netInclTaxes: '340,26 €',
        date: '30/04/2021',
        formattedEvents,
        recipient: {
          address: {
            fullAddress: '124 Avenue Daumesnil 75012 Paris',
            street: '124 Avenue Daumesnil',
            city: 'Paris',
            zipCode: '75012',
          },
          name: 'M. Alain TERIEUR',
        },
        forTpp: false,
        totalExclTaxes: '322,52 €',
        totalVAT: '17,74 €',
        formattedSubs: [{
          unitInclTaxes: '19,67 €',
          inclTaxes: '1 160,53 €',
          vat: '5,5',
          service: 'Temps de qualité - autonomie',
          volume: '55,50 h',
        }],
        company: {
          rcs: '814 998 779',
          address: {
            city: 'Paris',
            fullAddress: '24 Avenue Daumesnil 75012 Paris',
            street: '24 Avenue Daumesnil',
            zipCode: '75012',
          },
          logo: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png',
          name: 'Alenvi Home SAS',
        },
      },

    };

    const pdf = {
      content: [
        {
          columns: [
            [
              { image: paths[0], fit: [160, 40], margin: [0, 8, 0, 32] },
              { text: 'Alenvi Home SAS' },
              { text: '75012 Paris' },
              { text: 'RCS : 814 998 779' },
            ],
            [
              { text: 'Facture', alignment: 'right' },
              { text: 'FACT-101042100271', alignment: 'right' },
              { text: '30/04/2021', alignment: 'right' },
              { text: 'Paiement à réception', alignment: 'right', marginBottom: 20 },
              { text: 'M. Alain TERIEUR', alignment: 'right' },
              { text: '124 Avenue Daumesnil', alignment: 'right' },
              { text: '75012 Paris', alignment: 'right' },
            ],
          ],
          marginBottom: 20,
        },
        {
          table: {
            body: [
              [
                { text: 'Service', bold: true },
                { text: 'Prix unitaire TTC', bold: true },
                { text: 'Volume', bold: true },
                { text: 'Total TTC*', bold: true },
              ],
              [
                { text: 'Temps de qualité - autonomie' },
                { text: '19,67 €' },
                { text: '55,50 h' },
                { text: '1 160,53 €' },
              ],
            ],
            widths: ['*', 'auto', 'auto', 'auto'],
          },
          margin: [0, 40, 0, 8],
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
        { text: '*ce total intègre les financements, majorations et éventuelles remises.' },
        {
          columns: [
            { width: '*', text: '' },
            {
              table: { body: [
                [
                  { text: 'Total HT', bold: true },
                  { text: 'TVA', bold: true },
                  { text: 'Total TTC', bold: true },
                ],
                [
                  { text: '322,52 €' },
                  { text: '17,74 €' },
                  { text: '340,26 €' },
                ],
              ] },
              width: 'auto',
              margin: [0, 8, 0, 40],
              layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
            },
          ],
        },
        { text: 'Prestations réalisées chez M. Alain TERIEUR, 124 Avenue Daumesnil 75012 Paris.' },
        {
          table: {
            body: [
              [
                { text: 'Date', bold: true },
                { text: 'Intervenant', bold: true },
                { text: 'Début', bold: true },
                { text: 'Fin', bold: true },
                { text: 'Service', bold: true },
                { text: 'Majoration', bold: true },
              ],
              [
                { text: '01/04' },
                { text: 'G. TEST' },
                { text: '11:30' },
                { text: '13:30' },
                { text: 'Temps de qualité - autonomie' },
                { text: '' },
              ],
              [
                { text: '02/04' },
                { text: 'G. TEST' },
                { text: '12:00' },
                { text: '14:00' },
                { text: 'Temps de qualité - autonomie' },
                { stack: [{ text: '+ 25% (Dimanche)' }] },
              ],
            ],
            widths: ['auto', 'auto', 'auto', 'auto', 'auto', '*'],
          },
          marginTop: 8,
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png', name: 'logo.png' },
    ];

    downloadImages.returns(paths);

    const result = await Bill.getPdfContent(data);

    expect(JSON.stringify(result)).toEqual(JSON.stringify(pdf));
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });
});
