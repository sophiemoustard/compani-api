const { CREDIT_NOTE } = require('../../../helpers/constants');
const UtilsPdfHelper = require('./utils');
const UtilsHelper = require('../../../helpers/utils');

exports.getSubscriptionTableBody = creditNote => [
  [{ text: 'Service', bold: true }, { text: 'Prix unitaire TTC', bold: true }, { text: 'Total TTC*', bold: true }],
  [creditNote.subscription.service, creditNote.subscription.unitInclTaxes, creditNote.netInclTaxes],
];

exports.getSubscriptionTable = (creditNote) => {
  const customerIdentity = UtilsHelper.formatIdentity(creditNote.customer.identity, 'TFL');
  const { fullAddress } = creditNote.customer.contact.primaryAddress;

  return [
    { text: `Prestations réalisées chez ${customerIdentity}, ${fullAddress}.` },
    {
      table: { body: exports.getSubscriptionTableBody(creditNote), widths: ['*', 'auto', 'auto'] },
      margin: [0, 8, 0, 8],
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
    },
    { text: '*ce total intègre les financements, majorations et éventuelles remises.' },
  ];
};

exports.getBillingItemsTable = (creditNote) => {
  const billingItemsTableBody = [
    [
      { text: 'Intitulé', bold: true },
      { text: 'Prix unitaire TTC', bold: true },
      { text: 'Volume', bold: true },
      { text: 'Total TTC', bold: true },
    ],
  ];

  creditNote.billingItems.forEach((bi) => {
    billingItemsTableBody.push(
      [
        { text: `${bi.name}${bi.vat ? ` (TVA ${UtilsHelper.formatPercentage(bi.vat / 100)})` : ''}` },
        { text: UtilsPdfHelper.formatBillingPrice(bi.unitInclTaxes) },
        { text: `${UtilsHelper.roundFrenchNumber(bi.count)}` },
        { text: UtilsPdfHelper.formatBillingPrice(bi.inclTaxes) },
      ]
    );
  });

  return [
    {
      table: { body: billingItemsTableBody, widths: ['*', 'auto', 'auto', 'auto'] },
      margin: [0, 8, 0, 8],
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
    },
  ];
};

exports.getPdfContent = async (data) => {
  const { creditNote } = data;
  const content = [await UtilsPdfHelper.getHeader(creditNote.company, creditNote, CREDIT_NOTE)];
  content.push(...(creditNote.misc ? [{ text: `Motif de l'avoir : ${creditNote.misc}`, marginBottom: 16 }] : []));

  if (creditNote.formattedEvents) {
    content.push(
      UtilsPdfHelper.getPriceTable(creditNote),
      UtilsPdfHelper.getEventsTable(creditNote, !creditNote.forTpp)
    );
  } else if (creditNote.subscription) {
    content.push(exports.getSubscriptionTable(creditNote));
  } else if (creditNote.billingItems) {
    content.push(
      exports.getBillingItemsTable(creditNote),
      UtilsPdfHelper.getPriceTable(creditNote)
    );
  }

  return {
    content: content.flat(),
    defaultStyle: { font: 'Avenir', fontSize: 11 },
    styles: { marginRightLarge: { marginRight: 24 } },
  };
};
