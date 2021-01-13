const sinon = require('sinon');
const path = require('path');
const expect = require('expect');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const util = require('util');
const PdfHelper = require('../../../src/helpers/pdf');

describe('formatSurchargeHourForPdf', () => {
  it('should return just the hours', () => {
    const date = '2019-08-22 18:00';
    expect(PdfHelper.formatSurchargeHourForPdf(date)).toBe('18h');
  });

  it('should return the hours and the minutes', () => {
    const date = '2019-08-22 17:05';
    expect(PdfHelper.formatSurchargeHourForPdf(date)).toBe('17h05');
  });
});

describe('formatEventSurchargesForPdf', () => {
  let formatSurchargeHourForPdf;
  beforeEach(() => {
    formatSurchargeHourForPdf = sinon.stub(PdfHelper, 'formatSurchargeHourForPdf');
    formatSurchargeHourForPdf.callsFake(date => `${date}d`);
  });
  afterEach(() => {
    formatSurchargeHourForPdf.restore();
  });

  it('should set an empty array if the array of surcharges is empty', () => {
    const formattedSurcharges = PdfHelper.formatEventSurchargesForPdf([]);
    expect(formattedSurcharges).toEqual([]);
    sinon.assert.notCalled(formatSurchargeHourForPdf);
  });

  it('should set the surcharges', () => {
    const surcharges = [
      { percentage: 25 },
      { percentage: 15, startHour: '18', endHour: '20' },
    ];

    const formattedSurcharges = PdfHelper.formatEventSurchargesForPdf(surcharges);

    expect(formattedSurcharges).toEqual([
      { percentage: 25 },
      { percentage: 15, startHour: '18d', endHour: '20d' },
    ]);
    sinon.assert.calledTwice(formatSurchargeHourForPdf);
  });
});

describe('generatePdf', () => {
  let puppeteerLaunch;
  let pathResolve;
  let handlebarsRegisterHelper;
  let handlebarsCompile;
  let readFileStub;

  beforeEach(() => {
    puppeteerLaunch = sinon.stub(puppeteer, 'launch');
    pathResolve = sinon.stub(path, 'resolve');
    handlebarsRegisterHelper = sinon.stub(handlebars, 'registerHelper');
    handlebarsCompile = sinon.stub(handlebars, 'compile');
    readFileStub = sinon.stub(PdfHelper, 'readFile');
  });

  afterEach(() => {
    puppeteerLaunch.restore();
    pathResolve.restore();
    handlebarsRegisterHelper.restore();
    handlebarsCompile.restore();
    readFileStub.restore();
  });

  it('should generate pdf', async () => {
    puppeteerLaunch.returns({
      newPage: sinon.stub().returns({ setContent: sinon.stub(), pdf: sinon.stub().returns('result') }),
      close: sinon.stub(),
    });
    pathResolve.returns('templatepath');
    handlebarsCompile.returns(sinon.stub().returns('html'));
    readFileStub.returns('123');

    const result = await PdfHelper.generatePdf({ data: 'data' }, 'url');

    expect(result).toBe('result');

    sinon.assert.calledWithExactly(
      puppeteerLaunch,
      { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    );
    sinon.assert.calledWithExactly(puppeteerLaunch.getCall(0).returnValue.newPage);
    sinon.assert.calledWithExactly(pathResolve, './', 'url');
    sinon.assert.calledWithExactly(readFileStub, 'templatepath', 'utf8');
    sinon.assert.calledTwice(handlebarsRegisterHelper);
    sinon.assert.calledWithExactly(handlebarsCompile, '123');
    sinon.assert.calledWithExactly(handlebarsCompile.getCall(0).returnValue, { data: 'data' });
    sinon.assert.calledWithExactly(
      puppeteerLaunch.getCall(0).returnValue.newPage.getCall(0).returnValue.setContent,
      'html'
    );
    sinon.assert.calledWithExactly(
      puppeteerLaunch.getCall(0).returnValue.newPage.getCall(0).returnValue.pdf,
      { format: 'A4', printBackground: true }
    );
    sinon.assert.calledWithExactly(puppeteerLaunch.getCall(0).returnValue.close);
  });

  it('should call browser.close even though puppeteer threw an error', async () => {
    puppeteerLaunch.returns({
      newPage: () => { throw new Error('test'); },
      close: sinon.stub(),
    });

    try {
      await PdfHelper.generatePdf({}, 'url');
      sinon.expect(true).toBe(false); // should not execute because error is thrown
    } catch (e) {
      sinon.assert.calledOnce(puppeteerLaunch.getCall(0).returnValue.close);
    }
  });
});
