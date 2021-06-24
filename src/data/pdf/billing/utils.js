const FileHelper = require('../../../helpers/file');

exports.getImages = async (url) => {
  const imageList = [{ url, name: 'logo.png' }];

  return FileHelper.downloadImages(imageList);
};
