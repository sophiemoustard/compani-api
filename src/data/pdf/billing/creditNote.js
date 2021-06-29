const get = require('lodash/get');
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

exports.getPDFContent = async (data) => {
  const { creditNote } = data;
  const [logo] = get(creditNote, 'company.logo') ? await UtilsPdfHelper.getImages(creditNote.company.logo) : [null];
  const header = UtilsPdfHelper.getHeader(logo, creditNote, CREDIT_NOTE);

  const content = [header];

  if (creditNote.formattedEvents) {
    const priceTable = UtilsPdfHelper.getPriceTable(creditNote);
    const eventsTable = UtilsPdfHelper.getEventsTable(creditNote, !creditNote.forTpp);
    content.push(priceTable, eventsTable);
  } else {
    content.push(exports.getSubscriptionTable(creditNote));
  }

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: { marginRightLarge: { marginRight: 40 } },
  };
};
