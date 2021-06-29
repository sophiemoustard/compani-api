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
  ];
  bill.formattedSubs.forEach(sub => serviceTableBody.push(
    [
      { text: `${sub.service} (TVA ${sub.vat} %)` },
      { text: sub.unitInclTaxes },
      { text: sub.volume },
      { text: sub.inclTaxes },
    ]
  ));
  const serviceTable = [
    {
      table: { body: serviceTableBody, widths: ['*', 'auto', 'auto', 'auto'] },
      margin: [0, 40, 0, 8],
      layout: { vLineWidth: () => 0.5, hLineWidth: () => 0.5 },
    },
    { text: '*ce total intègre les financements, majorations et éventuelles remises.' },
  ];

  const priceTable = UtilsHelper.getPriceTable(bill);
  const eventTable = UtilsHelper.getEventTable(bill, !bill.forTpp);

  const content = [header, serviceTable, priceTable, eventTable];

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: { marginRightLarge: { marginRight: 40 } },
  };
};
