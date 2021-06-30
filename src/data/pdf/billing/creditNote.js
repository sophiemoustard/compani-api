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

exports.getPdfContent = async (data) => {
  const { creditNote } = data;
  const [logo] = get(creditNote, 'company.logo') ? await UtilsPdfHelper.getImages(creditNote.company.logo) : [null];
  const content = [UtilsPdfHelper.getHeader(logo, creditNote, CREDIT_NOTE)];

  if (creditNote.formattedEvents) {
    content.push(
      UtilsPdfHelper.getPriceTable(creditNote),
      UtilsPdfHelper.getEventsTable(creditNote, !creditNote.forTpp)
    );
  } else content.push(exports.getSubscriptionTable(creditNote));

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: { marginRightLarge: { marginRight: 40 } },
  };
};
