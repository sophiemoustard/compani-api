const PizZip = require('pizzip');
const DocxTemplater = require('docxtemplater');
const get = require('lodash/get');
const fs = require('fs');
const os = require('os');
const path = require('path');

const fsPromises = fs.promises;

const docxParser = tag => ({
  get(scope) {
    return tag === '.' ? scope : get(scope, tag);
  },
});

exports.createDocxTemplater = (file, data) => {
  const zip = new PizZip(file);
  const docxTemplater = new DocxTemplater(zip, { parser: docxParser, linebreaks: true });
  docxTemplater.render(data);

  return docxTemplater;
};

exports.createDocx = async (filePath, data) => {
  const file = await fsPromises.readFile(filePath, 'binary');
  const doc = exports.createDocxTemplater(file, data);
  const filledZip = doc.getZip().generate({ type: 'nodebuffer' });
  const date = new Date();
  const tmpOutputPath = path.join(os.tmpdir(), `template-filled-${date.getTime()}.docx`);
  await fsPromises.writeFile(tmpOutputPath, filledZip);
  return tmpOutputPath;
};
