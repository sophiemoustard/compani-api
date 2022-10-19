const get = require('lodash/get');
const FileHelper = require('../../../helpers/file');
const UtilsHelper = require('../../../helpers/utils');
const { BILL, BILLING_DOCUMENTS } = require('../../../helpers/constants');

exports.getImages = async (url) => {
  const imageList = [{ url, name: 'logo.png' }];

  return FileHelper.downloadImages(imageList);
};

exports.getHeader = async (company, item, type) => {
  const [companyLogo] = company.logo ? await exports.getImages(company.logo) : [null];
  const logo = companyLogo
    ? { image: companyLogo, fit: [160, 40], margin: [0, 0, 0, 40] }
    : { canvas: [{ type: 'rect', x: 0, y: 0, w: 160, h: 40, r: 0, color: 'white' }], margin: [0, 0, 0, 40] };

  return {
    header: {
      columns: [
        [
          logo,
          { text: item.company.name },
          { text: item.company.address.street },
          { text: `${item.company.address.zipCode} ${item.company.address.city}` },
          { text: item.company.rcs ? `RCS : ${item.company.rcs}` : '' },
          { text: item.company.rna ? `RNA : ${item.company.rna}` : '' },
        ],
        [
          { text: BILLING_DOCUMENTS[type], alignment: 'right' },
          { text: item.number, alignment: 'right' },
          { text: item.date, alignment: 'right' },
          {
            text: type === BILL ? 'Paiement à réception' : '',
            alignment: 'right',
            marginBottom: type === BILL ? 20 : 32,
          },
          { text: item.recipient.name, alignment: 'right' },
          { text: item.recipient.address.street || '', alignment: 'right' },
          { text: `${item.recipient.address.zipCode || ''} ${item.recipient.address.city || ''}`, alignment: 'right' },
        ],
      ],
      marginBottom: 20,
    },
    images: companyLogo ? [companyLogo] : [],
  };
};

exports.getPriceTableBody = item => [
  [{ text: 'Total HT', bold: true }, { text: 'TVA', bold: true }, { text: 'Total TTC', bold: true }],
  [
    { text: item.totalExclTaxes, style: 'marginRightLarge' },
    { text: item.totalVAT, style: 'marginRightLarge' },
    { text: item.netInclTaxes, style: 'marginRightLarge' },
  ],
];

exports.getPriceTable = item => [
  {
    columns: [
      { width: '*', text: '' },
      {
        table: { body: exports.getPriceTableBody(item) },
        width: 'auto',
        margin: [0, 8, 0, 40],
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      },
    ],
  },
];

exports.getEventTableContent = (event, displaySurcharge) => {
  const row = [
    { text: event.date },
    { text: event.identity },
    { text: event.startTime },
    { text: event.endTime },
    { text: event.service },
  ];

  if (displaySurcharge) {
    const surchargesText = [];
    if (get(event, 'surcharges.length')) {
      event.surcharges.forEach((surcharge) => {
        const { percentage, name, startHour, endHour } = surcharge;
        surchargesText.push({ text: `+ ${percentage}% (${name}${startHour ? ` ${startHour} - ${endHour}` : ''})` });
      });
      row.push({ stack: surchargesText });
    } else {
      row.push({ text: '' });
    }
  }
  return row;
};

exports.getEventsTableBody = (item, displaySurcharge) => {
  const eventTableBody = [
    [
      { text: 'Date', bold: true },
      { text: 'Intervenant(e)', bold: true },
      { text: 'Début', bold: true },
      { text: 'Fin', bold: true },
      { text: 'Service', bold: true },
    ],
  ];

  if (displaySurcharge) eventTableBody[0].push({ text: 'Majoration', bold: true });
  item.formattedEvents.forEach((event) => {
    eventTableBody.push(exports.getEventTableContent(event, displaySurcharge));
  });

  return eventTableBody;
};

exports.getEventsTable = (item, displaySurcharge) => {
  const customerIdentity = UtilsHelper.formatIdentity(item.customer.identity, 'TFL');
  const { fullAddress } = item.customer.contact.primaryAddress;
  const widths = ['auto', 'auto', 'auto', 'auto', '*'];
  if (displaySurcharge) widths.push('*');
  const eventTableBody = exports.getEventsTableBody(item, displaySurcharge);

  return [
    { text: `Prestations réalisées chez ${customerIdentity}, ${fullAddress}.` },
    {
      table: { body: eventTableBody, widths },
      marginTop: 8,
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
    },
  ];
};

exports.formatBillingPrice = price => (price == null ? '-' : UtilsHelper.formatPrice(price));
