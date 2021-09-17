const { BILL, AUTOMATIC } = require('../../../helpers/constants');
const UtilsPdfHelper = require('./utils');
const UtilsHelper = require('../../../helpers/utils');

exports.getPdfContent = async (data) => {
  const { bill } = data;
  const header = await UtilsPdfHelper.getHeader(bill.company, bill, BILL);

  const billDetailsTableBody = [
    [
      { text: 'Intitulé', bold: true },
      { text: 'Prix unitaire TTC', bold: true },
      { text: 'Volume', bold: true },
      { text: 'Total TTC', bold: true },
    ],
  ];

  bill.formattedDetails.forEach((detail) => {
    billDetailsTableBody.push(
      [
        { text: `${detail.name}${detail.vat ? ` (TVA ${UtilsHelper.formatPercentage(detail.vat / 100)})` : ''}` },
        { text: detail.unitInclTaxes ? UtilsHelper.formatPrice(detail.unitInclTaxes) : '-' },
        { text: detail.volume || '-' },
        { text: detail.total ? UtilsHelper.formatPrice(detail.total) : '-' },
      ]
    );
  });

  const serviceTable = [
    {
      table: { body: billDetailsTableBody, widths: ['*', 'auto', 'auto', 'auto'] },
      margin: [0, 40, 0, 8],
      layout: { vLineWidth: () => 0.5, hLineWidth: () => 0.5 },
    },
  ];

  const priceTable = UtilsPdfHelper.getPriceTable(bill);
  const eventsTable = UtilsPdfHelper.getEventsTable(bill, !bill.forTpp);

  const content = bill.type === AUTOMATIC
    ? [header, serviceTable, priceTable, eventsTable]
    : [header, serviceTable, priceTable];

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: { marginRightLarge: { marginRight: 40 } },
  };
};
