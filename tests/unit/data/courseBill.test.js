const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const UtilsHelper = require('../../../src/helpers/utils');
const CourseBill = require('../../../src/data/pdf/courseBilling/courseBill');
const { COPPER_GREY_200, COPPER_600 } = require('../../../src/helpers/constants');

describe('getPdfContent', () => {
  let downloadImages;
  let formatPrice;

  beforeEach(() => {
    downloadImages = sinon.stub(FileHelper, 'downloadImages');
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
  });

  afterEach(() => {
    downloadImages.restore();
    formatPrice.restore();
  });

  it('it should format and return course bill pdf (with billing items)', async () => {
    const paths = ['src/data/pdf/tmp/logo.png'];

    const bill = {
      course: { subProgram: { program: { name: 'Test' } } },
      mainFee: { price: 1000, count: 1, description: 'description' },
      billingPurchaseList: [
        { billingItem: { name: 'article 1' }, price: 10, count: 10 },
        { billingItem: { name: 'article 2' }, price: 20, count: 10, description: 'article cool' },
      ],
    };

    const pdf = {
      content: [
        { columns: [{ image: paths[0], width: 200, height: 42, alignment: 'right' }], marginBottom: 20 },
        {
          canvas: [{ type: 'rect', x: 0, y: 0, w: 200, h: 42, r: 0, fillOpacity: 0.5, color: 'white' }],
          absolutePosition: { x: 40, y: 40 },
        },
        {
          table: {
            body: [
              [
                { text: '#', style: 'header', alignment: 'left', marginRight: 20 },
                { text: 'Article & description', style: 'header', alignment: 'left' },
                { text: 'Quantité', style: 'header', alignment: 'center', marginLeft: 20, marginRight: 20 },
                { text: 'Prix unitaire', style: 'header', alignment: 'center', marginLeft: 20, marginRight: 20 },
                { text: 'Coût', alignment: 'right', style: 'header', marginLeft: 20 },
              ],
              [
                { text: 1, alignment: 'left' },
                { stack: [{ text: 'Test', alignment: 'left' }, { text: 'description', style: 'description' }] },
                { text: 1, alignment: 'center' },
                { text: '1000,00 €', alignment: 'center' },
                { text: '1000,00 €', alignment: 'right' },
              ],
              [
                { text: 2, alignment: 'left' },
                { stack: [{ text: 'article 1', alignment: 'left' }, { text: '', style: 'description' }] },
                { text: 10, alignment: 'center' },
                { text: '10,00 €', alignment: 'center' },
                { text: '100,00 €', alignment: 'right' },
              ],
              [
                { text: 3, alignment: 'left' },
                {
                  stack: [
                    { text: 'article 2', alignment: 'left' },
                    { text: 'article cool', style: 'description' },
                  ],
                },
                { text: 10, alignment: 'center' },
                { text: '20,00 €', alignment: 'center' },
                { text: '200,00 €', alignment: 'right' },
              ],
            ],
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
          },
          margin: [0, 40, 0, 8],
          layout: { vLineWidth: () => 0, hLineWidth: i => (i > 1 ? 1 : 0), hLineColor: () => COPPER_GREY_200 },
        },
        {
          columns: [
            { text: '' },
            { text: '' },
            { text: '' },
            { text: 'Sous-total', alignment: 'right' },
            { text: '1300,00 €', alignment: 'right', marginLeft: 22, marginRight: 4, width: 'auto' },
          ],
        },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: {
        marginRightLarge: { marginRight: 40 },
        header: { fillColor: COPPER_600, color: 'white' },
        description: { alignment: 'left', marginLeft: 8, fontSize: 10 },
      },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png', name: 'compani.png' },
    ];

    downloadImages.returns(paths);
    formatPrice.onCall(0).returns('1000,00 €');
    formatPrice.onCall(1).returns('1000,00 €');
    formatPrice.onCall(2).returns('10,00 €');
    formatPrice.onCall(3).returns('100,00 €');
    formatPrice.onCall(4).returns('20,00 €');
    formatPrice.onCall(5).returns('200,00 €');
    formatPrice.onCall(6).returns('1300,00 €');

    const result = await CourseBill.getPdfContent(bill);

    expect(JSON.stringify(result)).toEqual(JSON.stringify(pdf));
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });

  it('it should format and return course bill pdf (without billing items)', async () => {
    const paths = ['src/data/pdf/tmp/logo.png'];

    const bill = {
      course: { subProgram: { program: { name: 'Test' } } },
      mainFee: { price: 1000, count: 1, description: 'description' },
    };

    const pdf = {
      content: [
        { columns: [{ image: paths[0], width: 200, height: 42, alignment: 'right' }], marginBottom: 20 },
        {
          canvas: [{ type: 'rect', x: 0, y: 0, w: 200, h: 42, r: 0, fillOpacity: 0.5, color: 'white' }],
          absolutePosition: { x: 40, y: 40 },
        },
        {
          table: {
            body: [
              [
                { text: '#', style: 'header', alignment: 'left', marginRight: 20 },
                { text: 'Article & description', style: 'header', alignment: 'left' },
                { text: 'Quantité', style: 'header', alignment: 'center', marginLeft: 20, marginRight: 20 },
                { text: 'Prix unitaire', style: 'header', alignment: 'center', marginLeft: 20, marginRight: 20 },
                { text: 'Coût', alignment: 'right', style: 'header', marginLeft: 20 },
              ],
              [
                { text: 1, alignment: 'left' },
                { stack: [{ text: 'Test', alignment: 'left' }, { text: 'description', style: 'description' }] },
                { text: 1, alignment: 'center' },
                { text: '1000,00 €', alignment: 'center' },
                { text: '1000,00 €', alignment: 'right' },
              ],
            ],
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
          },
          margin: [0, 40, 0, 8],
          layout: { vLineWidth: () => 0, hLineWidth: i => (i > 1 ? 1 : 0), hLineColor: () => COPPER_GREY_200 },
        },
        {
          columns: [
            { text: '' },
            { text: '' },
            { text: '' },
            { text: 'Sous-total', alignment: 'right' },
            { text: '1000,00 €', alignment: 'right', marginLeft: 22, marginRight: 4, width: 'auto' },
          ],
        },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: {
        marginRightLarge: { marginRight: 40 },
        header: { fillColor: COPPER_600, color: 'white' },
        description: { alignment: 'left', marginLeft: 8, fontSize: 10 },
      },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png', name: 'compani.png' },
    ];

    downloadImages.returns(paths);
    formatPrice.onCall(0).returns('1000,00 €');
    formatPrice.onCall(1).returns('1000,00 €');
    formatPrice.onCall(2).returns('1000,00 €');

    const result = await CourseBill.getPdfContent(bill);

    expect(JSON.stringify(result)).toEqual(JSON.stringify(pdf));
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });
});
