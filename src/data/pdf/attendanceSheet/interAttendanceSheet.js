const UtilsPdfHelper = require('./utils');
const { COPPER_500 } = require('../../../helpers/constants');

const getSlotTableContent = slot => [
  { stack: [{ text: `${slot.date}` }, { text: `${slot.address || ''}`, fontSize: 8 }] },
  { stack: [{ text: `${slot.duration}` }, { text: `${slot.startHour} - ${slot.endHour}`, fontSize: 8 }] },
  { text: '' },
  { text: '' },
];

exports.getPdfContent = async (data) => {
  const { trainees } = data;
  const [conscience, compani, decision, signature] = await UtilsPdfHelper.getImages();

  const content = [];
  trainees.forEach((trainee, i) => {
    const title = `Émargements - ${trainee.traineeName}`;
    const columns = [
      [
        { text: `Nom de la formation : ${trainee.course.name}`, bold: true, marginBottom: 10 },
        { text: `Dates : du ${trainee.course.firstDate} au ${trainee.course.lastDate}` },
        { text: `Durée : ${trainee.course.duration}` },
        { text: `Structure : ${trainee.company}` },
        { text: `Intervenant(e) : ${trainee.course.trainer}` },
      ],
      { image: decision, width: 64 },
    ];
    const header = UtilsPdfHelper.getHeader(compani, conscience, title, columns);

    const body = [
      [
        { text: 'Créneaux', style: 'header' },
        { text: 'Durée', style: 'header' },
        { text: 'Signature stagiaire', style: 'header' },
        { text: 'Signature de l\'intervenant(e)', style: 'header' },
      ],
    ];
    trainee.course.slots.forEach(slot => body.push(getSlotTableContent(slot)));

    const table = [{
      table: { body, widths: ['auto', 'auto', '*', '*'], dontBreakRows: true },
      marginBottom: 8,
      pageBreak: i === trainees.length - 1 ? 'none' : 'after',
    }];

    content.push(header, table);
  });

  return {
    content: content.flat(),
    defaultStyle: { font: 'Avenir', fontSize: 10 },
    pageMargins: [40, 40, 40, 128],
    styles: {
      header: { bold: true, fillColor: COPPER_500, color: 'white', alignment: 'center' },
      title: { fontSize: 16, bold: true, margin: [8, 32, 0, 0], alignment: 'left', color: COPPER_500 },
    },
    footer() {
      return UtilsPdfHelper.getFooter(signature);
    },
  };
};
