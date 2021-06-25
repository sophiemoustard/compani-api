const get = require('lodash/get');
const FileHelper = require('../../../helpers/file');

exports.getImages = async (url) => {
  const imageList = [{ url, name: 'logo.png' }];

  return FileHelper.downloadImages(imageList);
};

exports.getHeader = (logo, item) => ({
  columns: [
    [
      { image: logo, fit: [160, 40], margin: [0, 8, 0, 32] },
      { text: item.company.name },
      { text: `${item.company.address.zipCode} ${item.company.address.city}` },
      { text: get(item, 'company.rcs') ? `RCS : ${item.company.rcs}` : `RNA : ${item.company.rna}` },
    ],
    [
      { text: 'Facture', alignment: 'right' },
      { text: item.number, alignment: 'right' },
      { text: item.date, alignment: 'right' },
      { text: 'Paiement à réception', alignment: 'right', marginBottom: 20 },
      { text: item.recipient.name, alignment: 'right' },
      { text: item.recipient.address.street, alignment: 'right' },
      { text: `${item.recipient.address.zipCode} ${item.recipient.address.city}`, alignment: 'right' },
    ],
  ],
  marginBottom: 20,
});

exports.getPriceTableBody = item => [
  [
    { text: 'Total HT', bold: true },
    { text: 'TVA', bold: true },
    { text: 'Total TTC', bold: true },
  ],
  [
    { text: item.totalExclTaxes },
    { text: item.totalVAT },
    { text: item.netInclTaxes },
  ],
];

exports.getPriceTable = item => ({
  columns: [
    { width: '*', text: '' },
    {
      table: { body: this.getPriceTableBody(item) },
      width: 'auto',
      margin: [0, 8, 0, 40],
      layout: { hLineWidth() { return 0.5; }, vLineWidth() { return 0.5; } },
    },
  ],
});

exports.getEventTableContent = (event, hasSurcharge) => {
  const row = [
    { text: event.date },
    { text: event.identity },
    { text: event.startTime },
    { text: event.endTime },
    { text: event.service },
  ];
  if (hasSurcharge) {
    if (get(event, 'surcharges.length')) {
      event.surcharges.forEach((surcharge) => {
        const { percentage, name, startHour, endHour } = surcharge;
        row.push({ stack: [{ text: `+ ${percentage}% (${name}${startHour ? ` ${startHour} - ${endHour}` : ''})` }] });
      });
    } else row.push({ text: '' });
  }
  return row;
};

exports.getEventTableBody = (item, hasSurcharge) => {
  const eventTableBody = [
    [
      { text: 'Date', bold: true },
      { text: 'Intervenant', bold: true },
      { text: 'Début', bold: true },
      { text: 'Fin', bold: true },
      { text: 'Service', bold: true },
    ],
  ];
  if (hasSurcharge) eventTableBody[0].push({ text: 'Majoration', bold: true });
  item.formattedEvents.forEach((event) => {
    eventTableBody.push(this.getEventTableContent(event, hasSurcharge));
  });

  return eventTableBody;
};

exports.getEventTable = (item, hasSurcharge, isBill) => {
  const { title, firstname, lastname } = item.customer.identity;
  const { fullAddress } = item.customer.contact.primaryAddress;
  const widths = Array(5).fill('auto');
  if (hasSurcharge) widths.push('*');
  const eventTableBody = this.getEventTableBody(item, hasSurcharge);

  return [
    { text: `Prestations ${isBill ? 'réalisées' : 'annulée'} chez ${title} ${firstname} ${lastname}, ${fullAddress}.` },
    {
      table: { body: eventTableBody, widths },
      marginTop: 8,
      layout: { hLineWidth() { return 0.5; }, vLineWidth() { return 0.5; } },
    },
  ];
};
