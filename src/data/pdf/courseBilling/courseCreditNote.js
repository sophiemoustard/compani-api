const { ORANGE_600 } = require('../../../helpers/constants');
const UtilsPdfHelper = require('./utils');
const PdfHelper = require('../../../helpers/pdf');
const CourseBillHelper = require('../../../helpers/courseBills');

exports.getPdfContent = async (creditNote) => {
  const [compani] = await UtilsPdfHelper.getImages();
  const netInclTaxes = CourseBillHelper.getNetInclTaxes(creditNote);
  const header = UtilsPdfHelper.getHeader(creditNote, compani);
  const feeTable = UtilsPdfHelper.getFeeTable(creditNote);
  const tableFooter = UtilsPdfHelper.getTotalInfos(netInclTaxes);

  const content = [header, feeTable, tableFooter];

  return {
    template: {
      content: content.flat(),
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: {
        header: { fillColor: ORANGE_600, color: 'white' },
        description: { alignment: 'left', marginLeft: 8, fontSize: 10 },
      },
    },
    images: [compani],
  };
};

exports.getPdf = async (data) => {
  const { template, images } = await exports.getPdfContent(data);

  return PdfHelper.generatePdf(template, images);
};
