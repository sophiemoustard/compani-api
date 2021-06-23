const get = require('lodash/get');
const FileHelper = require('../../helpers/file');
const { COPPER_500 } = require('../../helpers/constants');

exports.getImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/aux-pouce.png', name: 'aux-pouce.png' },
    { url: 'https://storage.googleapis.com/compani-main/doct-explication.png', name: 'doct-explication.png' },
    { url: 'https://storage.googleapis.com/compani-main/doct-quizz.png', name: 'doct-quizz.png' },
    { url: 'https://storage.googleapis.com/compani-main/aux-perplexite.png', name: 'aux-perplexite.png' },
  ];

  return FileHelper.downloadImages(imageList);
};

exports.getHeader = (image, misc, subProgram) => {
  const title = `${get(subProgram, 'program.name') || ''}${misc && ' - '}${misc || ''}`;
  return [
    {
      columns: [
        { image, width: 64, style: 'img' },
        [
          { text: 'Vous êtes convoqué(e) à la formation', style: 'surtitle' },
          { text: title, style: 'title' },
          { canvas: [{ type: 'line', x1: 20, y1: 20, x2: 400, y2: 20, lineWidth: 2, lineColor: '#E2ECF0' }] },
        ],
      ],
    },
  ];
};

exports.getPdfContent = async (data) => {
  const [thumb, explanation, quizz, confused] = await exports.getImages();
  console.log(data);
  const header = exports.getHeader(thumb, data.misc, data.subProgram);

  return {
    content: header,
    defaultStyle: { font: 'SourceSans', fontSize: 10 },
    styles: {
      title: { fontSize: 20, bold: true, alignment: 'left', color: COPPER_500, marginLeft: 24 },
      surtitle: { fontSize: 12, bold: true, alignment: 'left', marginTop: 24, marginLeft: 24 },
    },
  };
};
