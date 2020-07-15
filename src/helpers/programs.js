const flat = require('flat');
const Program = require('../models/Program');
const CloudinaryHelper = require('../helpers/cloudinary');
const moment = require('moment');

exports.createProgram = payload => (new Program(payload)).save();

exports.list = async query => Program.find(query).lean();

exports.getProgram = async programId => Program.findOne({ _id: programId })
  .populate({ path: 'steps', populate: 'activities' })
  .lean();

exports.updateProgram = async (programId, payload) =>
  Program.findOneAndUpdate({ _id: programId }, { $set: payload }, { new: true }).lean();

exports.uploadImage = async (programId, payload) => {
  const imageUploaded = await CloudinaryHelper.addImage({
    file: payload.file,
    folder: 'images/business/Compani/programs',
    public_id: `${payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`,
  });

  const updatePayload = {
    image: {
      publicId: imageUploaded.public_id,
      link: imageUploaded.secure_url,
    },
  };
  await Program.findOneAndUpdate(
    { _id: programId },
    { $set: flat(updatePayload) },
    { new: true }
  );
};
