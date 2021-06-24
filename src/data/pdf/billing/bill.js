const get = require('lodash/get');
const UtilsHelper = require('./utils');
const { PEACH_100 } = require('../../../helpers/constants');

const getSlotTableContent = slot => [
  { stack: [{ text: `${slot.date}` }, { text: `${slot.address}`, fontSize: 8 }] },
  { stack: [{ text: `${slot.duration}` }, { text: `${slot.startHour} - ${slot.endHour}`, fontSize: 8 }] },
  { text: '' },
  { text: '' },
];

exports.getPdfContent = async (data) => {
  const { bill } = data;
  console.log(bill.formattedSubs);
  const [logo] = await UtilsHelper.getImages(bill.company.logo);

  const content = [];
  const header = {
    columns: [
      [
        { image: logo, fit: [160, 40], margin: [0, 8, 0, 32] },
        { text: bill.company.name },
        { text: `${bill.company.address.zipCode} ${bill.company.address.city}` },
        { text: get(bill, 'company.rcs') ? `RCS : ${bill.company.rcs}` : `RNA : ${bill.company.rna}` },
      ],
      [
        { text: 'Facture', alignment: 'right' },
        { text: bill.number, alignment: 'right' },
        { text: bill.date, alignment: 'right' },
        { text: 'Paiement à réception', alignment: 'right', marginBottom: 20 },
        { text: bill.recipient.name, alignment: 'right' },
        { text: bill.recipient.address.street, alignment: 'right' },
        { text: `${bill.recipient.address.zipCode} ${bill.recipient.address.city}`, alignment: 'right' },
      ],
    ],
    marginBottom: 20,
  };
  const body = [
    [
      { text: 'Service', bold: true },
      { text: 'Prix unitaire TTC', bold: true },
      { text: 'Volume', bold: true },
      { text: 'Total TTC*', bold: true },
    ],
    [
      { text: bill.formattedSubs[0].service },
      { text: bill.formattedSubs[0].unitInclTaxes },
      { text: bill.formattedSubs[0].volume },
      { text: bill.formattedSubs[0].inclTaxes },
    ],
  ];
  const body2 = [
    [
      { text: 'Total HT', bold: true },
      { text: 'TVA', bold: true },
      { text: 'Total TTC', bold: true },
    ],
    [
      { text: bill.totalExclTaxes },
      { text: bill.totalVAT },
      { text: bill.netInclTaxes },
    ],
  ];
  const table1 = [
    { table: { body, widths: ['*', 'auto', 'auto', 'auto'] }, margin: [0, 40, 0, 8] },
    { text: '*ce total intègre les financements, majorations et éventuelles remises.' },
  ];
  const table2 = [
    { table: { body: body2, widths: ['auto', 'auto', 'auto', 'auto'] }, margin: [0, 8, 0, 40] },
  ];
  // const columns = [
  //   [
  //     { text: `Nom de la formation : ${trainee.course.name}`, bold: true },
  //     { text: `Dates : du ${trainee.course.firstDate} au ${trainee.course.lastDate}` },
  //     { text: `Durée : ${trainee.course.duration}` },
  //     { text: `Structure : ${trainee.company}` },
  //     { text: `Formateur : ${trainee.course.trainer}` },
  //   ],
  //   { image: decision, width: 64 },
  // ];

  // trainee.course.slots.forEach((slot) => { body.push(getSlotTableContent(slot)); });

  // const table = [{ table: { body, widths: ['auto', 'auto', '*', '*'] }, marginBottom: 8 }];

  // const footer = UtilsHelper.getFooter(i === trainees.length - 1, signature, 96);

  // content.push(header, table, footer);
  content.push(header, table1, table2);

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: {
      // header: { bold: true, alignment: 'center' },
      // title: { fontSize: 16, bold: true, margin: [8, 32, 0, 0], alignment: 'left', color: COPPER_500 },
    },
  };
};
