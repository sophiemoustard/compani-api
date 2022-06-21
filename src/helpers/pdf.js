const moment = require('moment');
const fs = require('fs');
const util = require('util');
const PdfPrinter = require('pdfmake');
const getStream = require('get-stream');
const FileHelper = require('./file');

exports.readFile = util.promisify(fs.readFile);

exports.formatSurchargeHourForPdf = date =>
  (moment(date).minutes() > 0 ? moment(date).format('HH[h]mm') : moment(date).format('HH[h]'));

exports.formatEventSurchargesForPdf = (eventSurcharges) => {
  const formattedSurcharges = eventSurcharges.map((surcharge) => {
    const sur = { ...surcharge };
    if (sur.startHour) {
      sur.startHour = exports.formatSurchargeHourForPdf(sur.startHour);
      sur.endHour = exports.formatSurchargeHourForPdf(sur.endHour);
    }
    return sur;
  });
  return formattedSurcharges;
};

exports.formatTable = (items, options) => {
  let out = '';
  if (items) {
    out = items.reduce(
      (acc, item) => `${acc}${options.fn(item)}`,
      ''
    );
  }

  return out;
};

const fonts = {
  Avenir: {
    normal: '../data/pdf/fonts/Avenir-Regular.otf',
    bold: '../data/pdf/fonts/Avenir-Bold.otf',
    italics: '../data/pdf/fonts/Avenir-Italic.otf',
  },
  Calibri: {
    normal: '../data/pdf/fonts/Calibri-Regular.ttf',
    bold: '../data/pdf/fonts/Calibri-Bold.TTF',
    italics: '../data/pdf/fonts/Calibri-Italic.ttf',
  },
  icon: {
    normal: '../data/pdf/fonts/icon.ttf',
  },
};

exports.generatePdf = async (template) => {
  console.log('before');
  const printer = new PdfPrinter(fonts);
  console.log('after');
  const doc = printer.createPdfKitDocument(template);
  doc.end();
  const pdf = await getStream.buffer(doc);
  FileHelper.deleteImages();

  return pdf;
};
