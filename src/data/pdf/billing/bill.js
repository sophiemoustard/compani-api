const get = require('lodash/get');
const UtilsHelper = require('./utils');

exports.getPdfContent = async (data) => {
  const { bill } = data;
  const [logo] = get(bill, 'company.logo') ? await UtilsHelper.getImages(bill.company.logo) : [null];
  const header = UtilsHelper.getHeader(logo, bill);
  const serviceTableBody = [
    [
      { text: 'Service', bold: true },
      { text: 'Prix unitaire TTC', bold: true },
      { text: 'Volume', bold: true },
      { text: 'Total TTC*', bold: true },
    ],
    [
      { text: bill.formattedSubs[0].service },
      { text: bill.formattedSubs[0].unitInclTaxes },
      { text: bill.formattedSubs[0].volume },
      { text: bill.formattedSubs[0].inclTaxes },
    ],
  ];
  const serviceTable = [
    {
      table: { body: serviceTableBody, widths: ['*', 'auto', 'auto', 'auto'] },
      margin: [0, 40, 0, 8],
      layout: { hLineWidth() { return 0.5; }, vLineWidth() { return 0.5; } },
    },
    { text: '*ce total intègre les financements, majorations et éventuelles remises.' },
  ];
  const priceTable = UtilsHelper.getPriceTable(bill);
  const eventTable = UtilsHelper.getEventTable(bill, !bill.forTpp, true);
  const content = [header, serviceTable, priceTable, eventTable];

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
  };
};
