const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const DocxTemplater = require('docxtemplater');
const drive = require('../models/Google/Drive');

const fsPromises = fs.promises;

exports.generateDocx = async (params) => {
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

exports.createAndReadFile = async (stream, outputPath) => new Promise((resolve, reject) => {
  const tmpFile = fs.createWriteStream(outputPath);
  stream.pipe(tmpFile);
  tmpFile.on('finish', () => {
    resolve(fs.createReadStream(outputPath));
  });
  tmpFile.on('error', err => reject(err));
});

exports.fileToBase64 = filePath => new Promise((resolve, reject) => {
  const buffers = [];
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('data', (chunk) => { buffers.push(chunk); });
  fileStream.once('end', () => {
    const buffer = Buffer.concat(buffers);
    resolve(buffer.toString('base64'));
  });
  fileStream.once('error', err => reject(err));
});

exports.exportToCsv = async (data) => {
  let csvContent = '\ufeff'; // UTF16LE BOM for Microsoft Excel
  data.forEach((rowArray, index) => {
    const rowArrayQuoted = rowArray.map((cell) => {
      if (cell === '') return cell;
      return typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell;
    });
    const row = rowArrayQuoted.join(';');

    csvContent += index === data.length - 1 ? row : `${row}\r\n`;
  });

  const date = new Date();
  const tmpOutputPath = path.join(os.tmpdir(), `exports-${date.getTime()}.docx`);

  await fsPromises.writeFile(tmpOutputPath, csvContent, 'utf8', () => {});

  return tmpOutputPath;
};
