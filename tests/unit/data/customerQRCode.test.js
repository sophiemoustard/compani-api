const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const PdfHelper = require('../../../src/helpers/pdf');
const CustomerQRCode = require('../../../src/data/pdf/customerQRCode/customerQRCode');

describe('getPdfContent', () => {
  let downloadImages;

  beforeEach(() => {
    downloadImages = sinon.stub(FileHelper, 'downloadImages');
  });

  afterEach(() => {
    downloadImages.restore();
  });

  it('it should format and return pdf content', async () => {
    const qrCode = 'imageBase64';
    const customerName = 'Nico';
    const paths = ['src/data/pdf/tmp/pointing.png', 'src/data/pdf/tmp/fond.png'];
    const pdf = {
      content: [
        { canvas: [{ type: 'rect', x: 300, y: 0, w: 515, h: 500, r: 0, color: 'white' }] },
        {
          columns: [
            [
              { text: 'Nico', alignment: 'center', marginBottom: 24 },
              { image: 'imageBase64', width: 160, alignment: 'center' },
              { image: paths[0], width: 160, marginLeft: -40 },
            ],
            [],
          ],
          absolutePosition: { x: 0, y: 16 },
        },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 20 },
      pageSize: 'LETTER',
      pageMargins: [0, 0, 0, 0],
      background: [{ image: paths[1], absolutePosition: { x: 48, y: 100 }, width: 320 }],
    };

    downloadImages.returns(paths);

    const result = await CustomerQRCode.getPdfContent({ qrCode, customerName });

    expect(JSON.stringify(result.template)).toEqual(JSON.stringify(pdf));
    expect(result.images).toEqual(paths);
    sinon.assert.calledOnceWithExactly(
      downloadImages,
      [
        { url: 'https://storage.googleapis.com/compani-main/aux-pointedudoigt.png', name: 'pointing.png' },
        { url: 'https://storage.googleapis.com/compani-main/background-yellow.png', name: 'fond.png' },
      ]
    );
  });
});

describe('getPdf', () => {
  let getPdfContent;
  let generatePdf;

  beforeEach(() => {
    getPdfContent = sinon.stub(CustomerQRCode, 'getPdfContent');
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
  });

  afterEach(() => {
    getPdfContent.restore();
    generatePdf.restore();
  });

  it('should get pdf', async () => {
    const data = { qrCode: 'imageBase64', customerName: 'Nico' };
    const template = {
      content: [
        { canvas: [{ type: 'rect', x: 300, y: 0, w: 515, h: 500, r: 0, color: 'white' }] },
        {
          columns: [
            [
              { text: 'Nico', alignment: 'center', marginBottom: 24 },
              { image: 'imageBase64', width: 160, alignment: 'center' },
            ],
            [],
          ],
          absolutePosition: { x: 0, y: 16 },
        },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 20 },
      pageSize: 'LETTER',
      pageMargins: [0, 0, 0, 0],
    };
    const images = [
      { url: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png', name: 'logo.png' },
    ];
    getPdfContent.returns({ template, images });
    generatePdf.returns('pdf');

    const result = await CustomerQRCode.getPdf(data);

    expect(result).toEqual('pdf');
    sinon.assert.calledOnceWithExactly(getPdfContent, data);
    sinon.assert.calledOnceWithExactly(generatePdf, template, images);
  });
});
