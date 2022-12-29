const sinon = require('sinon');
const { expect } = require('expect');
const path = require('path');
const os = require('os');
const fs = require('fs');
const DocxTemplater = require('docxtemplater');
const Drive = require('../../../src/models/Google/Drive');
const DocxHelper = require('../../../src/helpers/docx');

describe('generateDocx', () => {
  it('should dowload docx template from drive and return filled template path', async () => {
    const downloadFileByIdStub = sinon.stub(Drive, 'downloadFileById');
    const createDocxStub = sinon.stub(DocxHelper, 'createDocx');
    const params = { file: { fileId: '1234567890' }, data: { name: 'Test' } };
    const templateOutputPath = path.join(os.tmpdir(), 'template.docx');
    const filledTemplateOutputPath = path.join(os.tmpdir(), `template-filled-${new Date().getTime()}.docx`);
    createDocxStub.returns(filledTemplateOutputPath);

    const result = await DocxHelper.generateDocx(params);

    expect(result).toBe(filledTemplateOutputPath);
    sinon.assert.calledWithExactly(downloadFileByIdStub, { ...params.file, tmpFilePath: templateOutputPath });
    sinon.assert.calledWithExactly(createDocxStub, templateOutputPath, params.data);
    createDocxStub.restore();
    downloadFileByIdStub.restore();
  });
});

describe('createDocx', () => {
  it('should return filled docx template path', async () => {
    const createDocxStub = sinon.stub(DocxHelper, 'createDocxTemplater').returns(new DocxTemplater());
    const generateStub = sinon.stub().returns('This is a filled zip file');
    const getZipStub = sinon.stub(DocxTemplater.prototype, 'getZip').returns({ generate: generateStub });
    const readFileStub = sinon.stub(fs.promises, 'readFile');
    const writeFileStub = sinon.stub(fs.promises, 'writeFile');
    const date = new Date('01-01-2020');
    const fakeDate = sinon.useFakeTimers(date);
    const filePath = '/src/test/docx.docx';
    const data = { name: 'Test' };
    const outputPath = path.join(os.tmpdir(), `template-filled-${date.getTime()}.docx`);

    const result = await DocxHelper.createDocx(filePath, data);

    expect(result).toBe(outputPath);
    sinon.assert.calledWithExactly(readFileStub, filePath, 'binary');
    sinon.assert.calledOnce(createDocxStub);
    sinon.assert.calledOnce(getZipStub);
    sinon.assert.calledWithExactly(generateStub, { type: 'nodebuffer' });
    sinon.assert.calledWithExactly(writeFileStub, outputPath, 'This is a filled zip file');
    getZipStub.restore();
    readFileStub.restore();
    writeFileStub.restore();
    fakeDate.restore();
  });
});
