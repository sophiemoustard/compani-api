const CourseCreditNote = require('../models/CourseCreditNote');
const CourseCreditNoteNumber = require('../models/CourseCreditNoteNumber');

exports.createCourseCreditNote = async (payload) => {
  const lastCreditNoteNumber = await CourseCreditNoteNumber
    .findOneAndUpdate({}, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true })
    .lean();

  const formattedPayload = {
    ...payload,
    number: `AV-${lastCreditNoteNumber.seq.toString().padStart(5, '0')}`,
  };

  await CourseCreditNote.create(formattedPayload);
};
