const fs = require('fs');

exports.createAndReadFile = async (stream, outputPath) => new Promise((resolve) => {
  const tmpFile = fs.createWriteStream(outputPath);
  stream.pipe(tmpFile);
  tmpFile.on('finish', () => {
    resolve(fs.createReadStream(outputPath));
  });
});
