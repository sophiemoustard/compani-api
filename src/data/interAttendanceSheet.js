const http = require('http');
const axios = require('axios');
const PdfPrinter = require('pdfmake');
const font = require('pdfmake/build/vfs_fonts');

const fonts = {
  Roboto: {
    normal: Buffer.from(font.pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
  },
};

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

exports.generatePDF = async () => {
  const auxConscienceEclairee = await getBase64ImageFromURL(
    'https://storage.googleapis.com/compani-main/aux-conscience-eclairee.png'
  );
  const companiTextOrange = await getBase64ImageFromURL(
    'https://storage.googleapis.com/compani-main/compani_text_orange.png'
  );

  const printer = new PdfPrinter(fonts);
  const docDefinition = {
    content: [
      // {
      //   image: companiTextOrange,
      //   width: 200,
      //   height: 40,
      // },
      { text: 'Émargements - {{ traineeName }}', style: 'title' },
      {
        image: auxConscienceEclairee,
        width: 80,
      },
    ],
    styles: {
      header: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      title: {
        fontSize: 20,
        color: '#7B0046',
      },
    },
  };

  const doc = printer.createPdfKitDocument(docDefinition);
  doc.pipe(http.request(process.env.WEBSITE_HOSTNAME));
  doc.end();

  return doc;
};
