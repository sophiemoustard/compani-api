const sinon = require('sinon');
const path = require('path');
const os = require('os');
const fs = require('fs');
const JSZip = require('jszip');
const { PassThrough } = require('stream');
const ZipHelper = require('../../../src/helpers/zip');

describe('generateZip', () => {
  let file;
  let generateNodeStream;
  let writable;
  let createWriteStreamStub;
  beforeEach(() => {
    file = sinon.stub(JSZip.prototype, 'file');
    generateNodeStream = sinon.stub(JSZip.prototype, 'generateNodeStream').returns(new PassThrough());
    writable = new PassThrough();
    createWriteStreamStub = sinon.stub(fs, 'createWriteStream').returns(writable);
  });
  afterEach(() => {
    file.restore();
    generateNodeStream.restore();
    createWriteStreamStub.restore();
  });

  it('should generate an empty zip', async () => {
    const outputPath = path.join(os.tmpdir(), 'toto.zip');

    ZipHelper.generateZip('toto.zip', []);
    setTimeout(async () => {
      writable.emit('data', 'Ceci');
      writable.emit('data', 'est');
      writable.emit('data', 'un');
      writable.emit('data', 'test !');
      writable.emit('end');
    }, 100);

    sinon.assert.calledOnceWithExactly(generateNodeStream, { type: 'nodebuffer', streamFiles: true });
    sinon.assert.calledOnceWithExactly(createWriteStreamStub, outputPath);
    sinon.assert.notCalled(file);
  });

  it('should generate zip', async () => {
    const outputPath = path.join(os.tmpdir(), 'toto.zip');
    const files = [{ name: 'hello.txt', file: 'Hello world\n' }, { name: 'bye.txt', file: 'Bye world\n' }];

    ZipHelper.generateZip('toto.zip', files);
    setTimeout(async () => {
      writable.emit('data', 'Ceci');
      writable.emit('data', 'est');
      writable.emit('data', 'un');
      writable.emit('data', 'test !');
      writable.emit('end');
    }, 100);

    sinon.assert.calledOnceWithExactly(generateNodeStream, { type: 'nodebuffer', streamFiles: true });
    sinon.assert.calledOnceWithExactly(createWriteStreamStub, outputPath);
    sinon.assert.calledWithExactly(file.getCall(0), 'hello.txt', 'Hello world\n');
    sinon.assert.calledWithExactly(file.getCall(1), 'bye.txt', 'Bye world\n');
  });
});
