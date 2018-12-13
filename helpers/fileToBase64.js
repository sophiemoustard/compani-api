const fs = require('fs');

exports.fileToBase64 = path => new Promise((resolve, reject) => {
  const buffers = [];
  const fileStream = fs.createReadStream(path);
  fileStream.on('data', (chunk) => { buffers.push(chunk); });
  fileStream.once('end', () => {
    const buffer = Buffer.concat(buffers);
    resolve(buffer.toString('base64'));
  });
  fileStream.once('error', err => reject(err));
});
