const path = require('path');
const moment = require('moment');
const fs = require('fs');
const util = require('util');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
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

exports.generatePdf = async (data, templateUrl, options = { format: 'A4', printBackground: true }) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const templatePath = path.resolve('./', templateUrl);
    const content = await exports.readFile(templatePath, 'utf8');
    handlebars.registerHelper('table', exports.formatTable);
    handlebars.registerHelper('times', function (n, block) {
      let accum = '';
      for (let i = 0; i < n; ++i) accum += block.fn(this);
      return accum;
    });
    const template = handlebars.compile(content);
    const html = template(data);
    await page.setContent(html);
    const pdf = await page.pdf(options);
    await browser.close();

    return pdf;
  } catch (e) {
    if (browser) await browser.close();
    throw e;
  }
};

const fonts = {
  SourceSans: {
    normal: 'src/data/SourceSansPro-Regular.ttf',
    bold: 'src/data/SourceSansPro-Bold.ttf',
    italics: 'src/data/SourceSansPro-Italic.ttf',
  },
};

exports.generatePDF = async (template) => {
  const printer = new PdfPrinter(fonts);
  const doc = printer.createPdfKitDocument(template);
  doc.end();
  const pdf = await getStream.buffer(doc);
  FileHelper.deleteImages();

  return pdf;
};
