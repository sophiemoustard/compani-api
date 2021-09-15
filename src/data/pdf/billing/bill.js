const { BILL } = require('../../../helpers/constants');
const UtilsPdfHelper = require('./utils');
const UtilsHelper = require('../../../helpers/utils');

exports.getPdfContent = async (data) => {
  const { bill } = data;
  const header = await UtilsPdfHelper.getHeader(bill.company, bill, BILL);

  const serviceTableBody = [
    [
      { text: 'Intitulé', bold: true },
      { text: 'Prix unitaire TTC', bold: true },
      { text: 'Volume', bold: true },
      { text: 'Total TTC', bold: true },
    ],
  ];

  bill.formattedSubs.forEach((sub) => {
    serviceTableBody.push(
      [
        { text: `${sub.name} ${sub.vat ? `(TVA ${UtilsHelper.formatPercentage(sub.vat / 100)})` : ''}` },
        { text: sub.unitInclTaxes ? UtilsHelper.formatPrice(sub.unitInclTaxes) : '-' },
        { text: sub.volume || '-' },
        { text: sub.total ? UtilsHelper.formatPrice(sub.total) : '-' },
      ]
    );
  });

  const serviceTable = [
    {
      table: { body: serviceTableBody, widths: ['*', 'auto', 'auto', 'auto'] },
      margin: [0, 40, 0, 8],
      layout: { vLineWidth: () => 0.5, hLineWidth: () => 0.5 },
    },
  ];

  const priceTable = UtilsPdfHelper.getPriceTable(bill);
  const eventsTable = UtilsPdfHelper.getEventsTable(bill, !bill.forTpp);

  const content = [header, serviceTable, priceTable, eventsTable];

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: { marginRightLarge: { marginRight: 40 } },
  };
};
