const PdfHelper = require('../helpers/pdf');

const getSlotTableContent = slot => [
  { stack: [{ text: `${slot.date}` }, { text: `${slot.address}`, fontSize: 8 }] },
  { stack: [{ text: `${slot.duration}` }, { text: `${slot.startHour} - ${slot.endHour}`, fontSize: 8 }] },
  { text: '' },
  { text: '' },
];

exports.getPdfContent = async (data) => {
  const { trainees } = data;

  const conscience = await PdfHelper
    .getBase64ImageFromURL('https://storage.googleapis.com/compani-main/aux-conscience-eclairee.png');
  const compani = await PdfHelper
    .getBase64ImageFromURL('https://storage.googleapis.com/compani-main/compani_text_orange.png');
  const decision = await PdfHelper
    .getBase64ImageFromURL('https://storage.googleapis.com/compani-main/aux-prisededecision.png');
  const signature = await PdfHelper
    .getBase64ImageFromURL('https://storage.googleapis.com/compani-main/tsb_signature.png');

  const content = [];
  trainees.forEach((trainee) => {
    const body = [
      [
        { text: 'Créneaux', style: 'header' },
        { text: 'Durée', style: 'header' },
        { text: 'Signature stagiaire', style: 'header' },
        { text: 'Signature formateur', style: 'header' },
      ],
    ];

    trainee.course.slots.forEach((slot) => { body.push(getSlotTableContent(slot)); });

    content.push(
      {
        columns: [
          { image: conscience, width: 64 },
          [
            { image: compani, width: 132, height: 28, alignment: 'right' },
            { text: `Émargements - ${trainee.traineeName}`, style: 'title' },
          ],
        ],
        marginBottom: 20,
      },
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 100, r: 0, color: '#FEF4E4' }],
        absolutePosition: { x: 40, y: 150 },
      },
      {
        columns: [
          [
            { text: `Nom de la formation : ${trainee.course.name}`, bold: true },
            { text: `Dates : du ${trainee.course.firstDate} au ${trainee.course.lastDate}` },
            { text: `Durée : ${trainee.course.duration}` },
            { text: `Structure : ${trainee.company}` },
            { text: `Formateur : ${trainee.course.trainer}` },
          ],
          { image: decision, width: 64 },
        ],
        margin: [16, 0, 24, 16],
      },
      { table: { body, widths: ['auto', 'auto', '*', '*'] }, marginBottom: 8 },
      { text: 'Signature et tampon de l\'organisme de formation :' },
      { image: signature, width: 80, pageBreak: 'after', marginTop: 8, alignment: 'right' }
    );
  });

  return {
    content,
    defaultStyle: { font: 'SourceSans', fontSize: 10 },
    styles: {
      header: { bold: true, fillColor: '#7B0046', color: 'white', alignment: 'center' },
      title: { fontSize: 16, bold: true, margin: [8, 32, 0, 0], alignment: 'left', color: '#7B0046' },
    },
  };
};
