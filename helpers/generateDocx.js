const JSZip = require('jszip');
const DocxTemplater = require('docxtemplater');
const fs = require('fs');

const drive = require('../models/GoogleDrive');

const fsPromises = fs.promises;

exports.generateDocx = async (params) => {
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
