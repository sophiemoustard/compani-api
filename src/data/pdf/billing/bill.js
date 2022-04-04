const get = require('lodash/get');
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
        { text: UtilsPdfHelper.formatBillingPrice(detail.unitInclTaxes) },
        { text: detail.volume || '-' },
        { text: UtilsPdfHelper.formatBillingPrice(detail.total) },
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

  const footer = [
    { text: get(bill, 'company.customersConfig.billFooter'), fontSize: 9, marginTop: 12, alignment: 'justify' },
  ];

  const content = [
    header,
    serviceTable,
    priceTable,
    ...(bill.type === AUTOMATIC ? eventsTable : []),
    ...(get(bill, 'company.customersConfig.billFooter') ? footer : []),
  ];

  return {
    content: content.flat(),
    defaultStyle: { font: 'Avenir', fontSize: 11 },
    styles: { marginRightLarge: { marginRight: 24 } },
  };
};
