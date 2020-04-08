const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PdfHelper = require('./pdf');

exports.generateZip = () => new Promise(async (resolve, reject) => {
  const zip = new JSZip();

  zip.file('hello.txt', 'toto\n');

  const pdf = await PdfHelper.generatePdf({}, './src/data/bill.html');
  zip.file('toto.pdf', pdf);

  const tmpOutputPath = path.join(os.tmpdir(), 'template-filled.zip');

  zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(tmpOutputPath))
    .on('finish', () => {
      console.log('out.zip written.');
      resolve(tmpOutputPath);
    })
    .on('error', err => reject(err));
});
