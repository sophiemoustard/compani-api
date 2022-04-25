const CourseCreditNote = require('../models/CourseCreditNote');
const CourseCreditNoteNumber = require('../models/CourseCreditNoteNumber');
const VendorCompaniesHelper = require('./vendorCompanies');
const { CompaniDate } = require('./dates/companiDates');
const PdfHelper = require('./pdf');
const CourseCreditNotePdf = require('../data/pdf/courseBilling/courseCreditNote');

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

exports.generateCreditNotePdf = async (creditNoteId) => {
  const vendorCompany = await VendorCompaniesHelper.get();
  const creditNote = await CourseCreditNote.findOne({ _id: creditNoteId })
    .populate({
      path: 'courseBill',
      select: 'course number date courseFundingOrganisation billingPurchaseList mainFee billedAt',
      populate: [
        {
          path: 'course',
          select: 'subProgram',
          populate: { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
        },
        { path: 'courseFundingOrganisation', select: 'name address' },
        { path: 'billingPurchaseList', select: 'billingItem', populate: { path: 'billingItem', select: 'name' } },
      ],
    })
    .populate({ path: 'company', select: 'name address' })
    .lean();

  const data = {
    number: creditNote.number,
    date: CompaniDate(creditNote.date).format('dd/LL/yyyy'),
    misc: creditNote.misc,
    vendorCompany,
    company: creditNote.company,
    courseBill: {
      number: creditNote.courseBill.number,
      date: CompaniDate(creditNote.courseBill.billedAt).format('dd/LL/yyyy'),
    },
    funder: creditNote.courseBill.courseFundingOrganisation || creditNote.company,
    course: creditNote.courseBill.course,
    mainFee: creditNote.courseBill.mainFee,
    billingPurchaseList: creditNote.courseBill.billingPurchaseList,
  };

  const template = await CourseCreditNotePdf.getPdfContent(data);
  const pdf = await PdfHelper.generatePdf(template);

  return { pdf, creditNoteNumber: creditNote.number };
};
