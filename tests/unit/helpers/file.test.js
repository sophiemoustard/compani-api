const expect = require('expect');
const axios = require('axios');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PassThrough } = require('stream');
const FileHelper = require('../../../src/helpers/file');

describe('createReadAndReturnFile', () => {
  let readable;
  let writable;
  let createWriteStreamStub;
  let createReadStreamStub;
  const outputPath = '/src/data/file.txt';

  beforeEach(() => {
    readable = new PassThrough();
    writable = new PassThrough();
    createWriteStreamStub = sinon.stub(fs, 'createWriteStream').returns(writable);
    createReadStreamStub = sinon.stub(fs, 'createReadStream');
  });

  afterEach(() => {
    createWriteStreamStub.restore();
    createReadStreamStub.restore();
  });

  it('should rejects/errors if a write stream error occurs', async () => {
    const error = new Error('You crossed the streams!');

    const resultPromise = FileHelper.createReadAndReturnFile(readable, outputPath);
    setTimeout(async () => { writable.emit('error', error); }, 100);

    await expect(resultPromise).rejects.toEqual(error);
    sinon.assert.calledWithExactly(createWriteStreamStub, outputPath);
    sinon.assert.notCalled(createReadStreamStub);
  });

  it('should resolves if data writes successfully', async () => {
    const resultPromise = FileHelper.createReadAndReturnFile(readable, outputPath);
    setTimeout(async () => {
      readable.emit('data', 'Ceci');
      readable.emit('data', 'est');
      readable.emit('data', 'un');
      readable.emit('data', 'test !');
      readable.emit('end');
    }, 100);

    await expect(resultPromise).resolves.toEqual(undefined);
    sinon.assert.calledWithExactly(createWriteStreamStub, outputPath);
    sinon.assert.calledWithExactly(createReadStreamStub, outputPath);
  });
});

describe('fileToBase64', () => {
  let readable;
  let createReadStreamStub;
  const filePath = '/src/data/file.txt';

  beforeEach(() => {
    readable = new PassThrough();
    createReadStreamStub = sinon.stub(fs, 'createReadStream').returns(readable);
  });

  afterEach(() => {
    createReadStreamStub.restore();
  });

  it('should rejects/errors if read stream error occurs', async () => {
    const error = new Error('You crossed the stream!');
    const resultPromise = FileHelper.fileToBase64(filePath);
    setTimeout(async () => {
      readable.emit('error', error);
    }, 100);

    await expect(resultPromise).rejects.toEqual(error);
    sinon.assert.calledWithExactly(createReadStreamStub, filePath);
  });

  it('should resolves to a base64 string if data writes successfully', async () => {
    const resultPromise = FileHelper.fileToBase64(filePath);
    setTimeout(async () => {
      readable.emit('data', Buffer.from('Ceci', 'utf-8'));
      readable.emit('data', Buffer.from('est', 'utf-8'));
      readable.emit('data', Buffer.from('un', 'utf-8'));
      readable.emit('data', Buffer.from('test !', 'utf-8'));
      readable.end();
    }, 100);

    await expect(resultPromise).resolves.toEqual(expect.any(String));
    sinon.assert.calledWithExactly(createReadStreamStub, filePath);
  });
});

describe('downloadImages', () => {
  let get;
  let createAndReadFile;

  beforeEach(() => {
    get = sinon.stub(axios, 'get');
    createAndReadFile = sinon.stub(FileHelper, 'createAndReadFile');
  });

  afterEach(() => {
    get.restore();
    createAndReadFile.restore();
  });

  it('should download images from GCS', async () => {
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/aux-conscience-eclairee.png', name: 'conscience.png' },
      { url: 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png', name: 'compani.png' },
    ];
    const response = { data: {} };

    get.returns(response);

    const result = await FileHelper.downloadImages(imageList);

    sinon.assert.match(result[0], new RegExp(`src/data/pdf/tmp/[A-Za-z]{10}${imageList[0].name}`));
    sinon.assert.match(result[1], new RegExp(`src/data/pdf/tmp/[A-Za-z]{10}${imageList[1].name}`));
    sinon.assert.calledWithExactly(get.getCall(0), imageList[0].url, { responseType: 'stream' });
    sinon.assert.calledWithExactly(get.getCall(1), imageList[1].url, { responseType: 'stream' });
    sinon.assert.calledWithExactly(
      createAndReadFile.getCall(0),
      response.data,
      sinon.match(new RegExp(`src/data/pdf/tmp/[A-Za-z]{10}${imageList[0].name}`))
    );
    sinon.assert.calledWithExactly(
      createAndReadFile.getCall(1),
      response.data,
      sinon.match(new RegExp(`src/data/pdf/tmp/[A-Za-z]{10}${imageList[1].name}`))
    );
  });
});

describe('deleteImages', () => {
  let rmSync;

  beforeEach(() => {
    rmSync = sinon.stub(fs, 'rmSync');
  });

  afterEach(() => {
    rmSync.restore();
  });

  it('should do nothing if no images to delete', async () => {
    await FileHelper.deleteImages([]);

    sinon.assert.notCalled(rmSync);
  });

  it('should delete images', async () => {
    const images = ['src/data/pdf/tmp/toto.png', 'src/data/pdf/tmp/tata.pdf'];
    await FileHelper.deleteImages(images);

    sinon.assert.calledTwice(rmSync);
    sinon.assert.calledWithExactly(rmSync.getCall(0), 'src/data/pdf/tmp/toto.png');
    sinon.assert.calledWithExactly(rmSync.getCall(1), 'src/data/pdf/tmp/tata.pdf');
  });
});

describe('exportToCsv', () => {
  it('should return a csv file path from data array', async () => {
    const date = new Date('2020-01-04');
    const fakeDate = sinon.useFakeTimers(date);
    const data = [['Prénom', 'Nom', 'Age'], ['Jean', 'Bonbeurre', 50], ['Bob', 'Eponge', 20]];
    const outputPath = path.join(os.tmpdir(), `exports-${date.getTime()}.csv`);
    const writeFileStub = sinon.stub(fs.promises, 'writeFile');
    const csvContent = '\ufeff"Prénom";"Nom";"Age"\r\n"Jean";"Bonbeurre";50\r\n"Bob";"Eponge";20';

    const result = await FileHelper.exportToCsv(data);
    expect(result).toBe(outputPath);
    sinon.assert.calledWithExactly(writeFileStub, outputPath, csvContent, 'utf8');
    writeFileStub.restore();
    fakeDate.restore();
  });
});
