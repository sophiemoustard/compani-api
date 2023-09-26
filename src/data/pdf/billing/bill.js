const get = require('lodash/get');
const { BILL, AUTOMATIC } = require('../../../helpers/constants');
const UtilsPdfHelper = require('./utils');
const UtilsHelper = require('../../../helpers/utils');
const NumbersHelper = require('../../../helpers/numbers');
const PdfHelper = require('../../../helpers/pdf');

exports.getPdfContent = async (data) => {
  const { bill } = data;
  const { header, images } = await UtilsPdfHelper.getHeader(bill.company, bill, BILL);

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
  const displaySurcharge = bill.formattedEvents.some(ev => get(ev, 'surcharges.length'));
  const eventsTable = UtilsPdfHelper.getEventsTable(bill, displaySurcharge);

  const footer = [
    { text: get(bill, 'company.customersConfig.billFooter'), fontSize: 9, marginTop: 12, alignment: 'justify' },
  ];

  const totalEventPrice = bill.formattedDetails
    .reduce((acc, details) => NumbersHelper.add(acc, details.total), NumbersHelper.toString(0));

  const netInclTaxes = parseFloat(bill.netInclTaxes.split('€')[0].replace(',', '.'));

  const isMaxTppAmountReached = NumbersHelper.isGreaterThan(totalEventPrice, netInclTaxes) && bill.forTpp;

  const maxTppAmountReachedText = {
    width: 'auto',
    text: `Le montant maximum de prise en charge par le tiers-payeur est de ${bill.netInclTaxes}.`,
  };

  const content = [
    header,
    serviceTable,
    ...(isMaxTppAmountReached ? [maxTppAmountReachedText] : []),
    priceTable,
    ...(bill.type === AUTOMATIC ? eventsTable : []),
    ...(get(bill, 'company.customersConfig.billFooter') ? footer : []),
  ];

  return {
    template: {
      content: content.flat(),
      defaultStyle: { font: 'SourceSans', fontSize: 12 },
      styles: { marginRightLarge: { marginRight: 40 } },
    },
    images,
  };
};

exports.getPdf = async (data) => {
  const { template, images } = await exports.getPdfContent(data);

  return PdfHelper.generatePdf(template, images);
};
