const { google } = require('googleapis');
const User = require('../models/User');

// Auth needed by google drive API
const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_DRIVE_API_EMAIL,
  null,
  process.env.GOOGLE_DRIVE_API_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/drive.file'],
  null
);

// GdriveStorage class
function GdriveStorage() {
  this.drive = google.drive({ version: 'v3', auth: jwtClient });
  // this.opts = opts;
  // this.getDestination = (opts.destination || getDestination);
}

// Multer method for handling files
GdriveStorage.prototype._handleFile = async function _handleFile(req, file, cb) {
  try {
    const user = await User.findById(req.params._id).lean();
    if (!user.administrative.driveIdFolder) {
      throw new Error('multer gdrive storage engine: No Google Drive folder ID !');
    }
    const parentFolderId = user.administrative.driveIdFolder;
    const fileMetadata = {
      name: req.body.fileName || file.originalname,
      parents: parentFolderId ? [parentFolderId] : []
    };
    const media = {
      mimeType: req.body['Content-Type'],
      body: file.stream
    };
    // Google drive API method to upload file
    this.drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id' // Fields returned by Google API after creating file on drive (see Google API docs for all available fields)
    }, (err, res) => {
      if (err) {
        return cb(err, null);
      }
      return cb(null, { id: res.data.id });
    });
  } catch (e) {
    return cb(e, null);
  }
};

// Multer method for removing file if issue during upload
GdriveStorage.prototype._removeFile = function _removeFile(req, file, cb) {
  this.drive.files.delete({
    fileId: file.id
  }, cb);
};

module.exports = () => new GdriveStorage();
