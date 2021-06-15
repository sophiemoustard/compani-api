const FileHelper = require('../helpers/file');

const getImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/aux-conscience-eclairee.png', name: 'conscience.png' },
    { url: 'https://storage.googleapis.com/compani-main/compani_text_orange.png', name: 'compani.png' },
    { url: 'https://storage.googleapis.com/compani-main/aux-prisededecision.png', name: 'decision.png' },
    { url: 'https://storage.googleapis.com/compani-main/tsb_signature.png', name: 'signature.png' },
  ];

  return FileHelper.downloadImages(imageList);
};

exports.getPdfContent = async (data) => {
  const { dates } = data;
  const [conscience, compani, decision, signature] = await getImages();

  const content = [];
  dates.forEach((date, i) => {
    const header = [
      {
        columns: [
          { image: conscience, width: 64 },
          [
            { image: compani, width: 132, height: 28, alignment: 'right' },
            { text: `Feuille d'émargement - ${date.date}`, style: 'title' },
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
            { text: `Nom de la formation : ${date.course.name}`, bold: true },
            { text: `Durée : ${date.course.duration}` },
            { text: `Lieu : ${date.address}` },
            { text: `Structure : ${date.course.company}` },
            { text: `Intervenant : ${date.course.trainer}` },
          ],
          { image: decision, width: 64 },
        ],
        margin: [16, 0, 24, 16],
      },
    ];

    const body = [[{ text: 'Prénom NOM', style: 'header' }]];
    date.slots.forEach(slot => body[0].push({ text: `${slot.startHour} - ${slot.endHour}`, style: 'header' }));
    for (let j = 1; j <= 13; j++) {
      body.push([]);
      for (let k = 0; k <= date.slots.length; k++) {
        if (j === 13 && k === 0) body[j].push({ text: 'Signature du formateur', italics: true, margin: [0, 10, 0, 0] });
        else body[j].push({ text: '' });
      }
    }
    const heights = Array(14).fill(30);
    heights[0] = 'auto';
    const table = [{
      table: { body, widths: Array(body[0].length).fill('*'), heights },
      marginBottom: 8,
    }];

    const footer = [{ columns: [
      { text: 'Signature et tampon de l\'organisme de formation :', bold: true },
      {
        image: signature,
        width: 80,
        pageBreak: i === dates.length - 1 ? 'none' : 'after',
        marginTop: 8,
        alignment: 'right',
      },
    ] }];

    content.push(header, table, footer);
  });

  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 10 },
    styles: {
      header: { bold: true, fillColor: '#7B0046', color: 'white', alignment: 'center' },
      title: { fontSize: 16, bold: true, margin: [8, 32, 0, 0], alignment: 'left', color: '#7B0046' },
    },
  };
};
