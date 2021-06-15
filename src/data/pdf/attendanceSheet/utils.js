const FileHelper = require('../../../helpers/file');

exports.getImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/aux-conscience-eclairee.png', name: 'conscience.png' },
    { url: 'https://storage.googleapis.com/compani-main/compani_text_orange.png', name: 'compani.png' },
    { url: 'https://storage.googleapis.com/compani-main/aux-prisededecision.png', name: 'decision.png' },
    { url: 'https://storage.googleapis.com/compani-main/tsb_signature.png', name: 'signature.png' },
  ];

  return FileHelper.downloadImages(imageList);
};

exports.getHeader = (compani, conscience, title, columns) => [
  {
    columns: [
      { image: conscience, width: 64 },
      [
        { image: compani, width: 132, height: 28, alignment: 'right' },
        { text: title, style: 'title' },
      ],
    ],
    marginBottom: 20,
  },
  {
    canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 100, r: 0, color: '#FEF4E4' }],
    absolutePosition: { x: 40, y: 150 },
  },
  {
    columns,
    margin: [16, 0, 24, 16],
  },
];

exports.getFooter = (pageBreak, signature, width) => [
  {
    columns: [
      { text: 'Signature et tampon de l\'organisme de formation :', bold: true },
      {
        image: signature,
        width,
        pageBreak: pageBreak ? 'none' : 'after',
        marginTop: 8,
        alignment: 'right',
      },
    ],
  },
];
