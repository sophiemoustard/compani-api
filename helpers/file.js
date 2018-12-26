const fs = require('fs');
const JSZip = require('jszip');
const DocxTemplater = require('docxtemplater');
const drive = require('../models/GoogleDrive');

const fsPromises = fs.promises;

const generateDocx = async (params) => {
  params.file.tmpFilePath = '/tmp/template.docx';
  await drive.downloadFileById(params.file);
  const file = await fsPromises.readFile(params.file.tmpFilePath, 'binary');
  const zip = new JSZip(file);
  const doc = new DocxTemplater();
  doc.loadZip(zip);
  doc.setData(params.data);
  doc.render();
  const filledZip = doc.getZip().generate({
    type: 'nodebuffer'
  });
  const date = new Date();
  const tmpOutputPath = `/tmp/template-filled-${date.getTime()}.docx`;
  await fsPromises.writeFile(tmpOutputPath, filledZip);
  return tmpOutputPath;
};

const createAndReadFile = async (stream, outputPath) => new Promise((resolve, reject) => {
  const tmpFile = fs.createWriteStream(outputPath);
  stream.pipe(tmpFile);
  tmpFile.on('finish', () => {
    resolve(fs.createReadStream(outputPath));
  });
  tmpFile.on('error', err => reject(err));
});

const fileToBase64 = path => new Promise((resolve, reject) => {
  const buffers = [];
  const fileStream = fs.createReadStream(path);
  fileStream.on('data', (chunk) => { buffers.push(chunk); });
  fileStream.once('end', () => {
    const buffer = Buffer.concat(buffers);
    resolve(buffer.toString('base64'));
  });
  fileStream.once('error', err => reject(err));
});

module.exports = {
  generateDocx,
  createAndReadFile,
  fileToBase64,
};