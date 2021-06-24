const get = require('lodash/get');
const UtilsHelper = require('../../helpers/utils');
const FileHelper = require('../../helpers/file');
const { COPPER_500 } = require('../../helpers/constants');

exports.getImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/aux-pouce.png', name: 'aux-pouce.png' },
    { url: 'https://storage.googleapis.com/compani-main/doct-explication.png', name: 'doct-explication.png' },
    { url: 'https://storage.googleapis.com/compani-main/doct-quizz.png', name: 'doct-quizz.png' },
    { url: 'https://storage.googleapis.com/compani-main/aux-perplexite.png', name: 'aux-perplexite.png' },
  ];

  return FileHelper.downloadImages(imageList);
};

exports.getHeader = (image, misc, subProgram) => {
  const title = `${get(subProgram, 'program.name') || ''}${misc && ' - '}${misc || ''}`;
  return [
    {
      columns: [
        { image, width: 64, style: 'img' },
        [
          { text: 'Vous êtes convoqué(e) à la formation', style: 'surtitle' },
          { text: title, style: 'title' },
          { canvas: [{ type: 'line', x1: 20, y1: 10, x2: 400, y2: 10, lineWidth: 1, lineColor: '#E2ECF0' }] },
        ],
      ],
    },
  ];
};

const getSlotTableContent = slot => [
  { text: slot.date, style: 'tableContent' },
  { text: slot.hours, style: 'tableContent' },
  { text: slot.address, style: 'tableContent' },
];

exports.getTable = (slots, slotsToPlan) => {
  const body = [
    [
      { text: 'Dates', style: 'tableHeader' },
      { text: 'Heures', style: 'tableHeader' },
      { text: 'Lieux', style: 'tableHeader' },
    ],
  ];
  slots.forEach((slot) => { body.push(getSlotTableContent(slot)); });

  const table = [
    {
      table: { body, height: 24, widths: ['auto', '*', '*'] },
      layout: { vLineWidth: () => 0, hLineWidth: () => 1, hLineColor: () => '#E2ECF0' },
      marginTop: 24,
    },
  ];

  if (slotsToPlan.length) {
    table.push({ text: `Il reste ${slotsToPlan.length} créneau(x) à planifier.`, style: 'notes' });
  }

  return table;
};

exports.getProgramInfo = (image, program) => ({
  columns: [
    { image, width: 64, style: 'img' },
    [{ text: 'Programme de la formation', style: 'infoTitle' }, { text: program.description, style: 'infoContent' }],
  ],
  marginTop: 24,
});

exports.getTrainerAndContactInfo = (trainerImg, trainer, contactImg, contact) => ({
  columns: [
    {
      columns: [
        { image: trainerImg, width: 64, style: 'img' },
        [
          { text: 'Intervenant(e)', style: 'infoTitle' },
          { text: UtilsHelper.formatIdentity(get(trainer, 'identity'), 'FL'), style: 'infoSubTitle' },
          { text: get(trainer, 'biography') || '', style: 'infoContent' },
        ],
      ],
    },
    {
      columns: [
        { image: contactImg, width: 64, style: 'img' },
        [
          { text: 'Votre contact pour la formation', style: 'infoTitle' },
          { text: UtilsHelper.formatPhoneNumber(get(contact, 'phone')), style: 'infoSubTitle' },
          { text: get(contact, 'email') || '', style: 'infoSubTitle' },
        ],
      ],
    },
  ],
  marginTop: 24,
});

exports.getPdfContent = async (data) => {
  const [thumb, explanation, quizz, confused] = await exports.getImages();

  const header = exports.getHeader(thumb, data.misc, data.subProgram);
  const table = exports.getTable(data.slots, data.slotsToPlan);
  const programInfo = exports.getProgramInfo(explanation, data.subProgram.program);
  const trainerAndContactInfo = exports.getTrainerAndContactInfo(quizz, data.trainer, confused, data.contact);

  return {
    content: [header, table, programInfo, trainerAndContactInfo].flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 10 },
    styles: {
      title: { fontSize: 20, bold: true, alignment: 'left', color: COPPER_500, marginLeft: 24 },
      surtitle: { fontSize: 12, bold: true, alignment: 'left', marginTop: 24, marginLeft: 24 },
      tableHeader: { fontSize: 12, bold: true, alignment: 'center', marginTop: 4, marginBottom: 4 },
      tableContent: { fontSize: 12, alignment: 'center', marginTop: 4, marginBottom: 4 },
      notes: { italics: true, alignment: 'left', marginTop: 4 },
      infoTitle: { fontSize: 14, bold: true, marginLeft: 12 },
      infoSubTitle: { fontSize: 12, marginLeft: 12 },
      infoContent: { fontSize: 10, italics: true, marginLeft: 12 },
    },
  };
};
