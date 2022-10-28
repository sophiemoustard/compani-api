const FileHelper = require('../../helpers/file');
const PdfHelper = require('../../helpers/pdf');

exports.getPdfContent = async (data) => {
  const [pointing, fond] = await FileHelper.downloadImages([
    { url: 'https://storage.googleapis.com/compani-main/aux-pointedudoigt.png', name: 'pointing.png' },
    { url: 'https://storage.googleapis.com/compani-main/background-yellow.png', name: 'fond.png' },
  ]);

  const content = [
    { canvas: [{ type: 'rect', x: 300, y: 0, w: 515, h: 500, r: 0, color: 'white' }] },
    {
      columns: [
        [
          { text: data.customerName, alignment: 'center', marginBottom: 24 },
          { image: data.qrCode, width: 160, alignment: 'center' },
          { image: pointing, width: 160, marginLeft: -40 },
        ],
        [],
      ],
      absolutePosition: { x: 0, y: 16 },
    },
  ];

  return {
    template: {
      content: content.flat(),
      defaultStyle: { font: 'SourceSans', fontSize: 20 },
      pageSize: 'LETTER',
      pageMargins: [0, 0, 0, 0],
      background: [{ image: fond, absolutePosition: { x: 48, y: 100 }, width: 320 }],
    },
    images: [pointing, fond],
  };
};

exports.getPdf = async (data) => {
  const { template, images } = await exports.getPdfContent(data);

  return PdfHelper.generatePdf(template, images);
};
