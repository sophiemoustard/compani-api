const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const CreditNotePdf = require('../../../src/data/pdf/billing/creditNote');

describe('getPdfContent', () => {
  let downloadImages;

  beforeEach(() => {
    downloadImages = sinon.stub(FileHelper, 'downloadImages');
  });

  afterEach(() => {
    downloadImages.restore();
  });

  it('it should format and return pdf content for credit note with events', async () => {
    const paths = ['src/data/pdf/tmp/logo.png'];
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
      creditNote: {
        totalVAT: '17,74 €',
        date: '30/04/2021',
        number: 'AV-101042100271',
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
        customer: {
          identity: { title: 'mr', lastname: 'TERIEUR', firstname: 'Alain' },
          contact: {
            primaryAddress: {
              fullAddress: '124 Avenue Daumesnil 75012 Paris',
              street: '124 Avenue Daumesnil',
              city: 'Paris',
              zipCode: '75012',
            },
          },
        },
        formattedEvents,
        netInclTaxes: '340,26 €',
        totalExclTaxes: '322,52 €',
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
        misc: 'Je suis le motif, d\'ailleurs Mo\'Tif ça fait un bon nom de salon de coiffure',
      },

    };

    const pdf = {
      content: [
        {
          columns: [
            [
              { image: paths[0], fit: [160, 40], margin: [0, 0, 0, 40] },
              { text: 'Alenvi Home SAS' },
              { text: '24 Avenue Daumesnil' },
              { text: '75012 Paris' },
              { text: 'RCS : 814 998 779' },
              { text: '' },
            ],
            [
              { text: 'Avoir', alignment: 'right' },
              { text: 'AV-101042100271', alignment: 'right' },
              { text: '30/04/2021', alignment: 'right' },
              { text: '', alignment: 'right', marginBottom: 32 },
              { text: 'M. Alain TERIEUR', alignment: 'right' },
              { text: '124 Avenue Daumesnil', alignment: 'right' },
              { text: '75012 Paris', alignment: 'right' },
            ],
          ],
          marginBottom: 20,
        },
        {
          text: 'Motif de l\'avoir : Je suis le motif, d\'ailleurs Mo\'Tif ça fait un bon nom de salon de coiffure',
          marginBottom: 16,
        },
        {
          columns: [
            { width: '*', text: '' },
            {
              table: {
                body: [
                  [{ text: 'Total HT', bold: true }, { text: 'TVA', bold: true }, { text: 'Total TTC', bold: true }],
                  [
                    { text: '322,52 €', style: 'marginRightLarge' },
                    { text: '17,74 €', style: 'marginRightLarge' },
                    { text: '340,26 €', style: 'marginRightLarge' },
                  ],
                ],
              },
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
                { text: 'Intervenant(e)', bold: true },
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
            widths: ['auto', 'auto', 'auto', 'auto', '*', '*'],
          },
          marginTop: 8,
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: { marginRightLarge: { marginRight: 40 } },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png', name: 'logo.png' },
    ];

    downloadImages.returns(paths);

    const result = await CreditNotePdf.getPdfContent(data);

    expect(JSON.stringify(result)).toEqual(JSON.stringify(pdf));
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });

  it('it should format and return pdf content for credit note with subscription', async () => {
    const paths = ['src/data/pdf/tmp/logo.png'];
    const data = {
      creditNote: {
        totalVAT: '17,74 €',
        date: '30/04/2021',
        number: 'AV-101042100271',
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
        customer: {
          identity: { title: 'mr', lastname: 'TERIEUR', firstname: 'Alain' },
          contact: {
            primaryAddress: {
              fullAddress: '124 Avenue Daumesnil 75012 Paris',
              street: '124 Avenue Daumesnil',
              city: 'Paris',
              zipCode: '75012',
            },
          },
        },
        subscription: { service: 'Temps de qualité - Autonomie', unitInclTaxes: '12,26 €' },
        netInclTaxes: '340,26 €',
        totalExclTaxes: '322,52 €',
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
        misc: 'Je suis le motif, d\'ailleurs Mo\'Tif ça fait un bon nom de salon de coiffure',
      },

    };

    const pdf = {
      content: [
        {
          columns: [
            [
              { image: paths[0], fit: [160, 40], margin: [0, 0, 0, 40] },
              { text: 'Alenvi Home SAS' },
              { text: '24 Avenue Daumesnil' },
              { text: '75012 Paris' },
              { text: 'RCS : 814 998 779' },
              { text: '' },
            ],
            [
              { text: 'Avoir', alignment: 'right' },
              { text: 'AV-101042100271', alignment: 'right' },
              { text: '30/04/2021', alignment: 'right' },
              { text: '', alignment: 'right', marginBottom: 32 },
              { text: 'M. Alain TERIEUR', alignment: 'right' },
              { text: '124 Avenue Daumesnil', alignment: 'right' },
              { text: '75012 Paris', alignment: 'right' },
            ],
          ],
          marginBottom: 20,
        },
        {
          text: 'Motif de l\'avoir : Je suis le motif, d\'ailleurs Mo\'Tif ça fait un bon nom de salon de coiffure',
          marginBottom: 16,
        },
        { text: 'Prestations réalisées chez M. Alain TERIEUR, 124 Avenue Daumesnil 75012 Paris.' },
        {
          table: {
            body: [
              [
                { text: 'Service', bold: true },
                { text: 'Prix unitaire TTC', bold: true },
                { text: 'Total TTC*', bold: true },
              ],
              ['Temps de qualité - Autonomie', '12,26 €', '340,26 €'],
            ],
            widths: ['*', 'auto', 'auto'],
          },
          margin: [0, 8, 0, 8],
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
        { text: '*ce total intègre les financements, majorations et éventuelles remises.' },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: { marginRightLarge: { marginRight: 40 } },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png', name: 'logo.png' },
    ];

    downloadImages.returns(paths);

    const result = await CreditNotePdf.getPdfContent(data);

    expect(JSON.stringify(result)).toEqual(JSON.stringify(pdf));
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });

  it('it should format and return pdf content for credit note with billing items', async () => {
    const paths = ['src/data/pdf/tmp/logo.png'];
    const data = {
      creditNote: {
        totalVAT: '17,74 €',
        date: '30/04/2021',
        number: 'AV-101042100272',
        recipient: {
          address: {
            fullAddress: '35 rue du test 75012 Paris',
            street: '35 rue du test',
            city: 'Paris',
            zipCode: '75012',
          },
          name: 'M. Alain TERIEUR',
        },
        forTpp: false,
        customer: {
          identity: { title: 'mr', lastname: 'TERIEUR', firstname: 'Alain' },
          contact: {
            primaryAddress: {
              fullAddress: '124 boulevard Daumesnil 75012 Paris',
              street: '124 boulevard Daumesnil',
              city: 'Paris',
              zipCode: '75012',
            },
          },
        },
        netInclTaxes: '340,26 €',
        totalExclTaxes: '322,52 €',
        company: {
          rcs: '667 667 667',
          address: {
            city: 'Paris',
            fullAddress: '12 rue Daumesnil 75012 Paris',
            street: '12 rue Daumesnil',
            zipCode: '75012',
          },
          logo: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png',
          name: 'Ekip',
        },
        billingItems: [
          { name: 'Billing Murray', unitInclTaxes: 25, vat: 10, count: 2, inclTaxes: 50 },
          { name: 'Billing Burr', unitInclTaxes: 50, vat: 10, count: 1, inclTaxes: 50 },
        ],
      },
    };

    const pdf = {
      content: [
        {
          columns: [
            [
              { image: paths[0], fit: [160, 40], margin: [0, 0, 0, 40] },
              { text: 'Ekip' },
              { text: '12 rue Daumesnil' },
              { text: '75012 Paris' },
              { text: 'RCS : 667 667 667' },
              { text: '' },
            ],
            [
              { text: 'Avoir', alignment: 'right' },
              { text: 'AV-101042100272', alignment: 'right' },
              { text: '30/04/2021', alignment: 'right' },
              { text: '', alignment: 'right', marginBottom: 32 },
              { text: 'M. Alain TERIEUR', alignment: 'right' },
              { text: '35 rue du test', alignment: 'right' },
              { text: '75012 Paris', alignment: 'right' },
            ],
          ],
          marginBottom: 20,
        },
        {
          table: {
            body: [
              [
                { text: 'Intitulé', bold: true },
                { text: 'Prix unitaire TTC', bold: true },
                { text: 'Volume', bold: true },
                { text: 'Total TTC', bold: true },
              ],
              [{ text: 'Billing Murray (TVA 10,00 %)' }, { text: '25,00 €' }, { text: '2' }, { text: '50,00 €' }],
              [{ text: 'Billing Burr (TVA 10,00 %)' }, { text: '50,00 €' }, { text: '1' }, { text: '50,00 €' }],
            ],
            widths: ['*', 'auto', 'auto', 'auto'],
          },
          margin: [0, 8, 0, 8],
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
        {
          columns: [
            { width: '*', text: '' },
            {
              table: {
                body: [
                  [{ text: 'Total HT', bold: true }, { text: 'TVA', bold: true }, { text: 'Total TTC', bold: true }],
                  [
                    { text: '322,52 €', style: 'marginRightLarge' },
                    { text: '17,74 €', style: 'marginRightLarge' },
                    { text: '340,26 €', style: 'marginRightLarge' },
                  ],
                ],
              },
              width: 'auto',
              margin: [0, 8, 0, 40],
              layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
            },
          ],
        },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: { marginRightLarge: { marginRight: 40 } },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png', name: 'logo.png' },
    ];

    downloadImages.returns(paths);

    const result = await CreditNotePdf.getPdfContent(data);

    expect(JSON.stringify(result)).toEqual(JSON.stringify(pdf));
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });
});
