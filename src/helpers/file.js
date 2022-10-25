const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');

const fsPromises = fs.promises;
const TMP_FILES_PATH = `${path.resolve(__dirname, '../data/pdf/tmp')}/`;

exports.createReadAndReturnFile = async (stream, outputPath) => new Promise((resolve, reject) => {
  const tmpFile = fs.createWriteStream(outputPath)
    .on('finish', () => { resolve(fs.createReadStream(outputPath)); })
    .on('error', err => reject(err));

  stream.pipe(tmpFile);
});

exports.createAndReadFile = async (stream, outputPath) => new Promise((resolve, reject) => {
  const tmpFile = fs.createWriteStream(outputPath)
    .on('finish', () => { resolve(outputPath); })
    .on('error', err => reject(err));

  stream.pipe(tmpFile);
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

exports.downloadImages = async (imageList) => {
  if (!fs.existsSync(TMP_FILES_PATH)) fs.mkdirSync(TMP_FILES_PATH);

  const paths = [];
  for (const image of imageList) {
    const { url, name } = image;
    const response = await axios.get(url, { responseType: 'stream' });
    await this.createAndReadFile(response.data, `${TMP_FILES_PATH}${name}`);
    paths.push(`${TMP_FILES_PATH}${name}`);
  }

  return paths;
};

exports.deleteImages = (images = []) => {
  images.forEach((i) => { fs.rmSync(i); });
  fs.readdir(
    TMP_FILES_PATH,
    (err, data = []) => { if (!data.length) fs.rmdirSync(TMP_FILES_PATH, { recursive: true }); }
  );
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
