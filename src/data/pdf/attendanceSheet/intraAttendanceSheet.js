const UtilsPdfHelper = require('./utils');
const { COPPER_500 } = require('../../../helpers/constants');

exports.getPdfContent = async (data) => {
  const { dates } = data;
  const [conscience, compani, decision, signature] = await UtilsPdfHelper.getImages();

  const content = [];
  dates.forEach((date, i) => {
    const title = `Feuille d'émargement - ${date.date}`;
    const columns = [
      [
        { text: `Nom de la formation : ${date.course.name}`, bold: true, marginBottom: 10 },
        { text: `Durée : ${date.course.duration}` },
        { text: `Lieu : ${date.address}` },
        { text: `Structure : ${date.course.company}` },
        { text: `Intervenant(e) : ${date.course.trainer}` },
      ],
      { image: decision, width: 64 },
    ];
    const header = UtilsPdfHelper.getHeader(compani, conscience, title, columns);

    const body = [[{ text: 'Prénom NOM', style: 'header' }]];
    date.slots.forEach(slot => body[0].push({ text: `${slot.startHour} - ${slot.endHour}`, style: 'header' }));
    const numberOfRows = 11;
    for (let row = 1; row <= numberOfRows; row++) {
      body.push([]);
      for (let column = 0; column <= date.slots.length; column++) {
        if (row === numberOfRows && column === 0) {
          body[row].push({ text: 'Signature de l\'intervenant(e)', italics: true, margin: [0, 8, 0, 0] });
        } else body[row].push({ text: '' });
      }
    }
    const heights = Array(14).fill(28);
    heights[0] = 'auto';
    const table = [{
      table: { body, widths: Array(body[0].length).fill('*'), heights },
      marginBottom: 8,
      pageBreak: i === dates.length - 1 ? 'none' : 'after',
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
    footer: UtilsPdfHelper.getFooter(signature),
  };
};
