const FileHelper = require('../../helpers/file');

exports.getAttendanceSheetImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/aux-conscience-eclairee.png', name: 'conscience.png' },
    { url: 'https://storage.googleapis.com/compani-main/compani_text_orange.png', name: 'compani.png' },
    { url: 'https://storage.googleapis.com/compani-main/aux-prisededecision.png', name: 'decision.png' },
    { url: 'https://storage.googleapis.com/compani-main/tsb_signature.png', name: 'signature.png' },
  ];

  return FileHelper.downloadImages(imageList);
};
