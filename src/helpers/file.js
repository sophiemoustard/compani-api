const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');

const fsPromises = fs.promises;

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

exports.urlToBase64 = async (url) => {
  try {
    const image = await axios.get(url, { responseType: 'arraybuffer' });
    const raw = Buffer.from(image.data).toString('base64');

    return `data:${image.headers['content-type']};base64,${raw}`;
  } catch (e) {
    console.error(e);
    return null;
  }
};

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
  const tmpOutputPath = path.join(os.tmpdir(), `exports-${date.getTime()}.csv`);

  await fsPromises.writeFile(tmpOutputPath, csvContent, 'utf8');

  return tmpOutputPath;
};

exports.exportToTxt = async (data) => {
  let textContent = '';
  data.forEach((rowArray) => { textContent += `${rowArray.join('\t')}\r\n`; });

  const date = new Date();
  const tmpOutputPath = path.join(os.tmpdir(), `exports-${date.getTime()}.txt`);

  await fsPromises.writeFile(tmpOutputPath, textContent, { encoding: 'ascii' });

  return tmpOutputPath;
};
