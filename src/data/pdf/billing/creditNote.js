const get = require('lodash/get');
const { CREDIT_NOTE } = require('../../../helpers/constants');
const UtilsHelper = require('./utils');

exports.getPDFContent = async (data) => {
  const { creditNote } = data;
  const [logo] = get(creditNote, 'company.logo') ? await UtilsHelper.getImages(creditNote.company.logo) : [null];
  const header = UtilsHelper.getHeader(logo, creditNote, CREDIT_NOTE);

  const priceTable = UtilsHelper.getPriceTable(creditNote);

  const eventsTable = UtilsHelper.getEventsTable(creditNote, !creditNote.forTpp);

  const content = [header, priceTable, eventsTable];

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: { marginRightLarge: { marginRight: 40 } },
  };
};
