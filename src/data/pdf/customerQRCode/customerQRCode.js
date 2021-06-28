const FileHelper = require('../../../helpers/file');

exports.getPdfContent = async (qrCode, customerName) => {
  const [pointing, fond] = await FileHelper.downloadImages([
    { url: 'https://storage.googleapis.com/compani-main/aux-pointedudoigt.png', name: 'pointing.png' },
    { url: 'https://storage.googleapis.com/compani-main/background-yellow.png', name: 'fond.png' },
  ]);

  const content = [
    { canvas: [{ type: 'rect', x: 300, y: 0, w: 515, h: 500, r: 0, color: 'white' }] },
    {
      columns:
      [
        [
          { text: `${customerName}`, alignment: 'center', marginBottom: 24 },
          { image: qrCode, width: 160, alignment: 'center' },
          { image: pointing, width: 160, marginLeft: -40 },
        ],
        [],
      ],
      absolutePosition: { x: 0, y: 16 },
    },
  ];

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 20 },
    pageSize: 'LETTER',
    pageMargins: [0, 0, 0, 0],
    background: [{ image: fond, absolutePosition: { x: 48, y: 100 }, width: 320 }],
  };
};
