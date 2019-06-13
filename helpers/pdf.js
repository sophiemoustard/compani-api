const path = require('path');
const fs = require('fs');
const util = require('util');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');

const ReadFile = util.promisify(fs.readFile);

const formatTable = (items, options) => {
  let out = '';
  if (items) {
    for (let i = 0, l = items.length; i < l; i++) {
      out += options.fn(items[i]);
    }
  }

  return out;
};

const generatePdf = async (data, templateUrl) => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const templatePath = path.resolve('./', templateUrl);
  const content = await ReadFile(templatePath, 'utf8');
  handlebars.registerHelper('table', formatTable);
  const template = handlebars.compile(content);
  const html = template(data);
  await page.setContent(html);

  return page.pdf({ format: 'A4', printBackground: true });
};

module.exports = {
  generatePdf,
};
