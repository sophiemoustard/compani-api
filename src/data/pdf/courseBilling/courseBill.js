const { COPPER_600, PAYMENT } = require('../../../helpers/constants');
const UtilsPdfHelper = require('./utils');
const PdfHelper = require('../../../helpers/pdf');
const CourseBillHelper = require('../../../helpers/courseBills');

exports.getPdfContent = async (bill) => {
  const { coursePayments, courseCreditNote } = bill;
  const netInclTaxes = CourseBillHelper.getNetInclTaxes(bill);
  const amountPaid = coursePayments
    .reduce((acc, p) => (p.nature === PAYMENT ? acc + p.netInclTaxes : acc - p.netInclTaxes), 0);
  const totalBalance = courseCreditNote ? -amountPaid : netInclTaxes - amountPaid;
  const isPaid = !courseCreditNote && totalBalance <= 0;

  const [compani, signature] = await UtilsPdfHelper.getImages(isPaid);

  const header = UtilsPdfHelper.getHeader(bill, compani, true, isPaid);
  const feeTable = UtilsPdfHelper.getFeeTable(bill);
  const totalInfos = UtilsPdfHelper.getTotalInfos(netInclTaxes);
  const balanceInfos = UtilsPdfHelper.getBalanceInfos(courseCreditNote, amountPaid, netInclTaxes, totalBalance);

  const footer = [
    {
      text: 'En tant qu’organisme de formation, Compani est exonéré de la Taxe sur la Valeur Ajoutée (TVA).',
      fontSize: 8,
      marginTop: 48,
    },
    ...(isPaid ? [{ image: signature, width: 144, marginTop: 8, alignment: 'right' }] : []),
  ];

  const content = [header, feeTable, totalInfos, balanceInfos, footer];

  return {
    template: {
      content: content.flat(),
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: {
        header: { fillColor: COPPER_600, color: 'white' },
        description: { alignment: 'left', marginLeft: 8, fontSize: 10 },
      },
    },
    images: [compani, ...(isPaid ? [signature] : [])],
  };
};

exports.getPdf = async (data) => {
  const { template, images } = await exports.getPdfContent(data);

  return PdfHelper.generatePdf(template, images);
};
