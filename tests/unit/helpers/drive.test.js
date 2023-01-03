const sinon = require('sinon');
const { expect } = require('expect');
const path = require('path');
const os = require('os');
const DriveHelper = require('../../../src/helpers/drive');
const Drive = require('../../../src/models/Google/Drive');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');

describe('uploadFile', () => {
  it('should upload file and return attachment info', async () => {
    const attachmentInfo = { id: '1234567890', webViewLink: 'https://test.com/1234567890' };
    const docPayload = { fileName: 'test', 'Content-Type': 'application/pdf', file: 'This is a file' };
    const driveFolderId = '0987654321';
    const addFileStub = sinon.stub(GDriveStorageHelper, 'addFile');

    addFileStub.returns(attachmentInfo);

    const result = await DriveHelper.uploadFile(driveFolderId, docPayload);

    expect(result).toEqual({ attachment: { driveId: attachmentInfo.id, link: attachmentInfo.webViewLink } });
    sinon.assert.calledWithExactly(
      addFileStub,
      { driveFolderId, name: docPayload.fileName, type: docPayload['Content-Type'], body: docPayload.file }
    );
    addFileStub.restore();
  });
});

describe('downloadFile', () => {
  it('should download file and return its path', async () => {
    const date = new Date('2020-01-06');
    const fakeDate = sinon.useFakeTimers(date);
    const downloadFileByIdStub = sinon.stub(Drive, 'downloadFileById');
    downloadFileByIdStub.returns({ type: 'image/png' });
    const filePath = path.join(os.tmpdir(), `download-${date.getTime()}`);
    const driveId = '1234567890';

    const result = await DriveHelper.downloadFile(driveId);

    expect(result).toEqual({ filePath, type: 'image/png' });
    sinon.assert.calledWithExactly(downloadFileByIdStub, { fileId: driveId, tmpFilePath: filePath });
    fakeDate.restore();
    downloadFileByIdStub.restore();
  });
});
