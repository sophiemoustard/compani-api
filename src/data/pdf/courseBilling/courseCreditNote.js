const { ORANGE_600 } = require('../../../helpers/constants');
const UtilsPdfHelper = require('./utils');

exports.getPdfContent = async (creditNote) => {
  const header = await UtilsPdfHelper.getHeader(creditNote);
  const feeTable = UtilsPdfHelper.getFeeTable(creditNote);
  const tableFooter = UtilsPdfHelper.getTableFooter(creditNote);

  const content = [header, feeTable, tableFooter];

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: {
      header: { fillColor: ORANGE_600, color: 'white' },
      description: { alignment: 'left', marginLeft: 8, fontSize: 10 },
    },
  };
};
