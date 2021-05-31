const http = require('http');
// const axios = require('axios');
const PdfPrinter = require('pdfmake');
const font = require('pdfmake/build/vfs_fonts');

// PDFMake requires Roboto
const fonts = {
  Roboto: {
    normal: Buffer.from(font.pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(font.pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
  },
};

// function to get base64 from url for images
// const getBase64ImageFromURL = async (url) => {
//   try {
//     const image = await axios.get(url, { responseType: 'arraybuffer' });
//     const raw = Buffer.from(image.data).toString('base64');

//     return `data:${image.headers['content-type']};base64,${raw}`;
//   } catch (e) {
//     console.error(e);
//     return null;
//   }
// };

exports.generatePDF = async (data) => {
  const { trainees } = data;

  const printer = new PdfPrinter(fonts);

  const document = { content: [], styles: {} };
  trainees.forEach((trainee) => {
    const body = [
      [
        {
          text: 'Créneaux',
          bold: true,
          fillColor: '#7B0046',
          color: 'white',
        },
        {
          text: 'Durée',
          bold: true,
          fillColor: '#7B0046',
          color: 'white',
        },
        {
          text: 'Signature stagiaire',
          bold: true,
          fillColor: '#7B0046',
          color: 'white',
        },
        {
          text: 'Signature formateur',
          bold: true,
          fillColor: '#7B0046',
          color: 'white',
        },
      ],
    ];
    trainee.course.slots.forEach((slot) => {
      body.push([
        {
          stack: [
            {
              text: `${slot.date}`,
              maxWidth: 151,
            },
            {
              text: `${slot.address}`,
              maxWidth: 151,
            },
          ],
          maxWidth: 151,
        },
        {
          stack: [
            {
              text: `${slot.duration}`,
              maxWidth: 75,
            },
            {
              text: `${slot.startHour} - ${slot.endHour}`,
              maxWidth: 75,
            },
          ],
          maxWidth: 75,
        },
        {
          text: '',
        },
        {
          text: '',
        },
      ]);
    });

    document.content.push(
      {
        text: `Émargements - ${trainee.traineeName}`,
        fontSize: 18,
        bold: true,
        marginBottom: 5,
      },
      { text: `Nom de la formation : ${trainee.course.name}`, bold: true },
      { text: `Dates : du ${trainee.course.firstDate} au ${trainee.course.lastDate}` },
      { text: `Durée : ${trainee.course.duration}` },
      { text: `Structure : ${trainee.company}` },
      { text: `Formateur : ${trainee.course.trainer}` },
      {
        table: {
          body,
        },
        marginBottom: 5,
      },
      {
        text: 'Signature et tampon de l\'organisme de formation :',
        pageBreak: 'after',
      }
    );
  });

  const doc = printer.createPdfKitDocument(document);
  doc.pipe(http.request(process.env.WEBSITE_HOSTNAME));
  doc.end();

  return doc;
};
