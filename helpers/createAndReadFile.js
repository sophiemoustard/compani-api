const fs = require('fs');

exports.createAndReadFile = async (stream, outputPath) => new Promise((resolve, reject) => {
  const tmpFile = fs.createWriteStream(outputPath);
  stream.pipe(tmpFile);
  tmpFile.on('finish', () => {
    resolve(fs.createReadStream(outputPath));
  });
  tmpFile.on('error', err => reject(err));
});
