const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const DocxTemplater = require('docxtemplater');
const drive = require('../models/Google/Drive');

const fsPromises = fs.promises;

const generateDocx = async (params) => {
  params.file.tmpFilePath = path.join(os.tmpdir(), 'template.docx');
  await drive.downloadFileById(params.file);

  const file = await fsPromises.readFile(params.file.tmpFilePath, 'binary');
  const zip = new JSZip(file);
  const doc = new DocxTemplater();
  doc.loadZip(zip);
  doc.setData(params.data);
  doc.render();
  const filledZip = doc.getZip().generate({ type: 'nodebuffer' });
  const date = new Date();
  const tmpOutputPath = path.join(os.tmpdir(), `template-filled-${date.getTime()}.docx`);
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

const fileToBase64 = filePath => new Promise((resolve, reject) => {
  const buffers = [];
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('data', (chunk) => { buffers.push(chunk); });
  fileStream.once('end', () => {
    const buffer = Buffer.concat(buffers);
    resolve(buffer.toString('base64'));
  });
  fileStream.once('error', err => reject(err));
});

const exportToCsv = async (data) => {
  let csvContent = '';
  data.forEach((rowArray) => {
    const rowArrayQuoted = rowArray.map((cell) => {
      if (cell === '') return cell;
      return `"${cell.replace(/"/g, '""')}"`;
    });
    const row = rowArrayQuoted.join(';');
    csvContent += `${row}\r\n`;
  });

  const date = new Date();
  const tmpOutputPath = path.join(os.tmpdir(), `exports-${date.getTime()}.docx`);

  await fsPromises.writeFile(tmpOutputPath, csvContent, 'utf8', () => {});

  return tmpOutputPath;
};

module.exports = {
  generateDocx,
  createAndReadFile,
  fileToBase64,
  exportToCsv,
};
