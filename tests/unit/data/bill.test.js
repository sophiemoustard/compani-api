const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const PdfHelper = require('../../../src/helpers/pdf');
const UtilsHelper = require('../../../src/helpers/utils');
const Bill = require('../../../src/data/pdf/billing/bill');

describe('getPdfContent', () => {
  let downloadImages;
  let formatPrice;
  let formatPercentage;

  beforeEach(() => {
    downloadImages = sinon.stub(FileHelper, 'downloadImages');
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
    formatPercentage = sinon.stub(UtilsHelper, 'formatPercentage');
  });

  afterEach(() => {
    downloadImages.restore();
    formatPrice.restore();
    formatPercentage.restore();
  });

  it('it should format and return pdf content with eventsTable details and images', async () => {
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
        surcharges: [
          { _id: '608053dd562eab001560c2b6', percentage: 25, name: 'Dimanche' },
          { _id: '9876543234567899876534j3', percentage: 30, name: 'Midi' },
        ],
      },
    ];
    const data = {
      bill: {
        number: 'FACT-101042100271',
        type: 'automatic',
        customer: {
          identity: { title: 'mr', lastname: 'TERIEUR', firstname: 'Alain' },
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
        formattedDetails: [
          {
            unitInclTaxes: 19.67,
            vat: 5.5,
            name: 'Temps de qualité - autonomie',
            volume: '55,50 h',
            total: 1091.685,
          },
          { name: 'Remises', total: 5 },
          { name: 'Majorations', total: 12.24 },
        ],
        company: {
          rcs: '814 998 779',
          address: {
            city: 'Paris',
            fullAddress: '24 Avenue Daumesnil 75012 Paris',
            street: '24 Avenue Daumesnil',
            zipCode: '75012',
          },
          customersConfig: { billFooter: 'Sku skusku' },
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
              { image: paths[0], fit: [160, 40], margin: [0, 0, 0, 40] },
              { text: 'Alenvi Home SAS' },
              { text: '24 Avenue Daumesnil' },
              { text: '75012 Paris' },
              { text: 'RCS : 814 998 779' },
              { text: '' },
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
                { text: 'Intitulé', bold: true },
                { text: 'Prix unitaire TTC', bold: true },
                { text: 'Volume', bold: true },
                { text: 'Total TTC', bold: true },
              ],
              [
                { text: 'Temps de qualité - autonomie (TVA 5,50 %)' },
                { text: '19,67 €' },
                { text: '55,50 h' },
                { text: '1091,69 €' },
              ],
              [
                { text: 'Remises' },
                { text: '-' },
                { text: '-' },
                { text: '5,00 €' },
              ],
              [
                { text: 'Majorations' },
                { text: '-' },
                { text: '-' },
                { text: '12,24 €' },
              ],
            ],
            widths: ['*', 'auto', 'auto', 'auto'],
          },
          margin: [0, 40, 0, 8],
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
                { stack: [{ text: '+ 25% (Dimanche)' }, { text: '+ 30% (Midi)' }] },
              ],
            ],
            widths: ['auto', 'auto', 'auto', 'auto', '*', '*'],
          },
          marginTop: 8,
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
        { text: 'Sku skusku', fontSize: 9, marginTop: 12, alignment: 'justify' },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: { marginRightLarge: { marginRight: 40 } },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png', name: 'logo.png' },
    ];

    downloadImages.returns(paths);
    formatPrice.onCall(0).returns('19,67 €');
    formatPrice.onCall(1).returns('1091,69 €');
    formatPrice.onCall(2).returns('5,00 €');
    formatPrice.onCall(3).returns('12,24 €');
    formatPercentage.onCall(0).returns('5,50 %');

    const result = await Bill.getPdfContent(data);

    expect(JSON.stringify(result.template)).toEqual(JSON.stringify(pdf));
    expect(result.images).toEqual(paths);
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });

  it('it should format and return pdf content without eventsTable details and images', async () => {
    const paths = ['src/data/pdf/tmp/logo.png'];

    const data = {
      bill: {
        number: 'FACT-101042100271',
        type: 'manual',
        customer: {
          identity: { title: 'mr', lastname: 'TERIEUR', firstname: 'Alain' },
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
        netInclTaxes: '40,00 €',
        date: '30/04/2021',
        formattedEvents: [],
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
        totalExclTaxes: '35,61 €',
        totalVAT: '4,39 €',
        formattedDetails: [
          { name: 'Frais de dossier', unitInclTaxes: 30, volume: 1, total: 30, vat: 20 },
          { name: 'Equipement de protection individuel', unitInclTaxes: 2, volume: 5, total: 10, vat: 20 },
          { name: 'Article offert', unitInclTaxes: 0, volume: 5, total: 0, vat: 20 },
        ],
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
              { image: paths[0], fit: [160, 40], margin: [0, 0, 0, 40] },
              { text: 'Alenvi Home SAS' },
              { text: '24 Avenue Daumesnil' },
              { text: '75012 Paris' },
              { text: 'RCS : 814 998 779' },
              { text: '' },
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
                { text: 'Intitulé', bold: true },
                { text: 'Prix unitaire TTC', bold: true },
                { text: 'Volume', bold: true },
                { text: 'Total TTC', bold: true },
              ],
              [
                { text: 'Frais de dossier (TVA 20 %)' },
                { text: '30,00 €' },
                { text: 1 },
                { text: '30,00 €' },
              ],
              [
                { text: 'Equipement de protection individuel (TVA 20 %)' },
                { text: '2,00 €' },
                { text: 5 },
                { text: '10,00 €' },
              ],
              [
                { text: 'Article offert (TVA 20 %)' },
                { text: '0,00 €' },
                { text: 5 },
                { text: '0,00 €' },
              ],
            ],
            widths: ['*', 'auto', 'auto', 'auto'],
          },
          margin: [0, 40, 0, 8],
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
                    { text: '35,61 €', style: 'marginRightLarge' },
                    { text: '4,39 €', style: 'marginRightLarge' },
                    { text: '40,00 €', style: 'marginRightLarge' },
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
    formatPrice.onCall(0).returns('30,00 €');
    formatPrice.onCall(1).returns('30,00 €');
    formatPrice.onCall(2).returns('2,00 €');
    formatPrice.onCall(3).returns('10,00 €');
    formatPrice.onCall(4).returns('0,00 €');
    formatPrice.onCall(5).returns('0,00 €');
    formatPercentage.onCall(0).returns('20 %');
    formatPercentage.onCall(1).returns('20 %');
    formatPercentage.onCall(2).returns('20 %');

    const result = await Bill.getPdfContent(data);

    expect(JSON.stringify(result.template)).toEqual(JSON.stringify(pdf));
    expect(result.images).toEqual(paths);
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });

  it('it should format and return pdf content with eventsTable details for tpp', async () => {
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
        surcharges: [
          { _id: '608053dd562eab001560c2b6', percentage: 25, name: 'Dimanche' },
          { _id: '9876543234567899876534j3', percentage: 30, name: 'Midi' },
        ],
      },
    ];
    const data = {
      bill: {
        number: 'FACT-101042100271',
        type: 'automatic',
        customer: {
          identity: { title: 'mr', lastname: 'TERIEUR', firstname: 'Alain' },
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
        netInclTaxes: '10,00 €',
        date: '30/06/2022',
        formattedEvents,
        recipient: {
          address: {
            fullAddress: '34 Avenue Daumesnil 75012 Paris',
            street: '34 Avenue Daumesnil',
            city: 'Paris',
            zipCode: '75012',
          },
          name: 'Conseil Départemental des Hauts de Seine -APA- Direction de l\'autonomie',
        },
        forTpp: true,
        totalExclTaxes: '9,48 €',
        totalVAT: '0,52 €',
        formattedDetails: [
          {
            unitInclTaxes: 19.67,
            vat: 5.5,
            name: 'Temps de qualité - autonomie',
            volume: '5,50 h',
            total: 108.185,
          },
          { name: 'Remises', total: 5 },
          { name: 'Majorations', total: 12.24 },
        ],
        company: {
          rcs: '814 998 779',
          address: {
            city: 'Paris',
            fullAddress: '24 Avenue Daumesnil 75012 Paris',
            street: '24 Avenue Daumesnil',
            zipCode: '75012',
          },
          customersConfig: { billFooter: 'Sku skusku' },
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
              { image: paths[0], fit: [160, 40], margin: [0, 0, 0, 40] },
              { text: 'Alenvi Home SAS' },
              { text: '24 Avenue Daumesnil' },
              { text: '75012 Paris' },
              { text: 'RCS : 814 998 779' },
              { text: '' },
            ],
            [
              { text: 'Facture', alignment: 'right' },
              { text: 'FACT-101042100271', alignment: 'right' },
              { text: '30/06/2022', alignment: 'right' },
              { text: 'Paiement à réception', alignment: 'right', marginBottom: 20 },
              { text: 'Conseil Départemental des Hauts de Seine -APA- Direction de l\'autonomie', alignment: 'right' },
              { text: '34 Avenue Daumesnil', alignment: 'right' },
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
              [
                { text: 'Temps de qualité - autonomie (TVA 5,50 %)' },
                { text: '19,67 €' },
                { text: '5,50 h' },
                { text: '108,19 €' },
              ],
              [
                { text: 'Remises' },
                { text: '-' },
                { text: '-' },
                { text: '5,00 €' },
              ],
              [
                { text: 'Majorations' },
                { text: '-' },
                { text: '-' },
                { text: '12,24 €' },
              ],
            ],
            widths: ['*', 'auto', 'auto', 'auto'],
          },
          margin: [0, 40, 0, 8],
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
        { width: 'auto', text: 'Le montant maximum de prise en charge par le tiers-payeur est de 10,00 €.' },
        {
          columns: [
            { width: '*', text: '' },
            {
              table: {
                body: [
                  [{ text: 'Total HT', bold: true }, { text: 'TVA', bold: true }, { text: 'Total TTC', bold: true }],
                  [
                    { text: '9,48 €', style: 'marginRightLarge' },
                    { text: '0,52 €', style: 'marginRightLarge' },
                    { text: '10,00 €', style: 'marginRightLarge' },
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
                { stack: [{ text: '+ 25% (Dimanche)' }, { text: '+ 30% (Midi)' }] },
              ],
            ],
            widths: ['auto', 'auto', 'auto', 'auto', '*', '*'],
          },
          marginTop: 8,
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
        { text: 'Sku skusku', fontSize: 9, marginTop: 12, alignment: 'justify' },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: { marginRightLarge: { marginRight: 40 } },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png', name: 'logo.png' },
    ];

    downloadImages.returns(paths);
    formatPrice.onCall(0).returns('19,67 €');
    formatPrice.onCall(1).returns('108,19 €');
    formatPrice.onCall(2).returns('5,00 €');
    formatPrice.onCall(3).returns('12,24 €');
    formatPercentage.onCall(0).returns('5,50 %');

    const result = await Bill.getPdfContent(data);

    expect(JSON.stringify(result.template)).toEqual(JSON.stringify(pdf));
    expect(result.images).toEqual(paths);
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });
});

describe('getPdf', () => {
  let getPdfContent;
  let generatePdf;

  beforeEach(() => {
    getPdfContent = sinon.stub(Bill, 'getPdfContent');
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
  });

  afterEach(() => {
    getPdfContent.restore();
    generatePdf.restore();
  });

  it('should get pdf', async () => {
    const data = {
      bill: {
        number: 'FACT-101042100271',
        type: 'automatic',
        customer: { identity: { title: 'mr', lastname: 'TERIEUR', firstname: 'Alain' } },
        netInclTaxes: '10,00 €',
        date: '30/06/2022',
        forTpp: true,
        totalExclTaxes: '9,48 €',
        totalVAT: '0,52 €',
      },
    };
    const template = {
      content: [
        { width: 'auto', text: 'Le montant maximum de prise en charge par le tiers-payeur est de 10,00 €.' },
        { text: 'Prestations réalisées chez M. Alain TERIEUR, 124 Avenue Daumesnil 75012 Paris.' },
        { text: 'Sku skusku', fontSize: 9, marginTop: 12, alignment: 'justify' },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: { marginRightLarge: { marginRight: 40 } },
    };
    const images = [{ url: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png', name: 'logo.png' }];
    getPdfContent.returns({ template, images });
    generatePdf.returns('pdf');

    const result = await Bill.getPdf(data);

    expect(result).toEqual('pdf');
    sinon.assert.calledOnceWithExactly(getPdfContent, data);
    sinon.assert.calledOnceWithExactly(generatePdf, template, images);
  });
});
