const axios = require('axios');
const PdfPrinter = require('pdfmake');
const font = require('pdfmake/build/vfs_fonts');
const getStream = require('get-stream');

// PDFMake requires Roboto
const fonts = {
  Roboto: {
    normal: Buffer.from(font.pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(font.pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
  },
  SourceSans: {
    normal: 'src/data/SourceSansPro-Regular.ttf',
    bold: 'src/data/SourceSansPro-Bold.ttf',
  },
};

// function to get base64 from url for images
const getBase64ImageFromURL = async (url) => {
  try {
    const image = await axios.get(url, { responseType: 'arraybuffer' });
    const raw = Buffer.from(image.data).toString('base64');

    return `data:${image.headers['content-type']};base64,${raw}`;
  } catch (e) {
    console.error(e);
    return null;
  }
};

exports.generatePDF = async (data) => {
  const { trainees } = data;

  const printer = new PdfPrinter(fonts);
  const image = await getBase64ImageFromURL('https://storage.googleapis.com/compani-main/aux-conscience-eclairee.png');
  const compani = await getBase64ImageFromURL('https://storage.googleapis.com/compani-main/compani_text_orange.png');
  const image3 = await getBase64ImageFromURL('https://storage.googleapis.com/compani-main/aux-prisededecision.png');
  const image4 = await getBase64ImageFromURL('https://storage.googleapis.com/compani-main/tsb_signature.png');

  const document = { content: [], defaultStyle: { font: 'SourceSans', fontSize: 10 }, styles: {} };
  trainees.forEach((trainee) => {
    const body = [
      [
        { text: 'Créneaux', bold: true, fillColor: '#7B0046', color: 'white', alignment: 'center' },
        { text: 'Durée', bold: true, fillColor: '#7B0046', color: 'white', alignment: 'center' },
        { text: 'Signature stagiaire', bold: true, fillColor: '#7B0046', color: 'white', alignment: 'center' },
        { text: 'Signature formateur', bold: true, fillColor: '#7B0046', color: 'white', alignment: 'center' },
      ],
    ];

    trainee.course.slots.forEach((slot) => {
      body.push([
        {
          stack: [
            { text: `${slot.date}`, maxWidth: 151 },
            { text: `${slot.address}`, maxWidth: 151, fontSize: 8 },
          ],
        },
        {
          stack: [
            { text: `${slot.duration}`, maxWidth: 75 },
            { text: `${slot.startHour} - ${slot.endHour}`, maxWidth: 75, fontSize: 8 },
          ],
        },
        { text: '' },
        { text: '' },
      ]);
    });

    document.content.push(
      {
        columns: [
          { image, width: 64 },
          [
            { image: compani, width: 132, height: 28, alignment: 'right' },
            {
              text: `Émargements - ${trainee.traineeName}`,
              fontSize: 16,
              bold: true,
              margin: [0, 40, 0, 0],
              alignment: 'left',
              color: '#7B0046',
            },
          ],
        ],
        marginBottom: 20,
      },
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 100, r: 0, color: '#fef4e4' }],
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
          { image: image3, width: 64 },
        ],
        margin: [15, 0, 20, 15],
      },
      { table: { body, widths: ['auto', 'auto', '*', '*'] }, marginBottom: 10 },
      { text: 'Signature et tampon de l\'organisme de formation :' },
      { image: image4, width: 80, pageBreak: 'after', marginTop: 8, alignment: 'right' }
    );
  });

  const doc = printer.createPdfKitDocument(document);
  doc.end();
  return getStream.buffer(doc);
};
