const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.generateZip = (fileList, zipName) => new Promise(async (resolve, reject) => {
  const zip = new JSZip();
  for (const file of fileList) {
    zip.file(file.name, file.file);
  }

  const tmpOutputPath = path.join(os.tmpdir(), zipName);

  zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(tmpOutputPath))
    .on('finish', () => {
      console.log('out.zip written.');
      resolve({ zipPath: tmpOutputPath, zipName });
    })
    .on('error', err => reject(err));
});
