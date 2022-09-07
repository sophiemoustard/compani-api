const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
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
    const paths = [
      'src/data/pdf/tmp/pointing.png',
      'src/data/pdf/tmp/fond.png',
    ];
    const pdf = {
      content: [
        { canvas: [{ type: 'rect', x: 300, y: 0, w: 515, h: 500, r: 0, color: 'white' }] },
        {
          columns:
          [
            [
              { text: `${customerName}`, alignment: 'center', marginBottom: 24 },
              { image: qrCode, width: 160, alignment: 'center' },
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

    const result = await CustomerQRCode.getPdfContent(qrCode, customerName);

    expect(result).toMatchObject(pdf);
    sinon.assert.calledOnceWithExactly(
      downloadImages,
      [
        { url: 'https://storage.googleapis.com/compani-main/aux-pointedudoigt.png', name: 'pointing.png' },
        { url: 'https://storage.googleapis.com/compani-main/background-yellow.png', name: 'fond.png' },
      ]
    );
  });
});
