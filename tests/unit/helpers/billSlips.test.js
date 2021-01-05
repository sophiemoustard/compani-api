const sinon = require('sinon');
const moment = require('moment');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const path = require('path');
const BillSlipHelper = require('../../../src/helpers/billSlips');
const BillSlipNumber = require('../../../src/models/BillSlipNumber');
const BillRepository = require('../../../src/repositories/BillRepository');
const CreditNoteRepository = require('../../../src/repositories/CreditNoteRepository');
const BillSlip = require('../../../src/models/BillSlip');
const DocxHelper = require('../../../src/helpers/docx');
const UtilsHelper = require('../../../src/helpers/utils');

require('sinon-mongoose');

describe('getBillSlips', () => {
  let getBillsSlipList;
  let getCreditNoteList;
  beforeEach(() => {
    getBillsSlipList = sinon.stub(BillRepository, 'getBillsSlipList');
    getCreditNoteList = sinon.stub(CreditNoteRepository, 'getCreditNoteList');
  });
  afterEach(() => {
    getBillsSlipList.restore();
    getCreditNoteList.restore();
  });

  it('should return bill slips list', async () => {
    const company = { _id: new ObjectID() };

    const billsSlipList = [
      { thirdPartyPayer: { _id: new ObjectID() }, month: '2020-01', netInclTaxes: 120 },
    ];
    getBillsSlipList.returns(billsSlipList);
    const creditNotesSlipList = [
      { thirdPartyPayer: { _id: billsSlipList[0].thirdPartyPayer._id }, month: '2020-01', netInclTaxes: 11 },
    ];
    getCreditNoteList.returns(creditNotesSlipList);

    const res = await BillSlipHelper.getBillSlips({ company });

    expect(res).toEqual([{ ...billsSlipList[0], netInclTaxes: 109 }]);
    sinon.assert.calledWithExactly(getBillsSlipList, company._id);
    sinon.assert.calledWithExactly(getCreditNoteList, company._id);
  });

  it('should not take credit notes into account if not same month', async () => {
    const company = { _id: new ObjectID() };

    const billsSlipList = [
      { thirdPartyPayer: { _id: new ObjectID() }, month: '2020-01', netInclTaxes: 120 },
    ];
    getBillsSlipList.returns(billsSlipList);
    const creditNotesSlipList = [
      { thirdPartyPayer: { _id: billsSlipList[0].thirdPartyPayer._id }, month: '2020-02', netInclTaxes: 11 },
    ];
    getCreditNoteList.returns(creditNotesSlipList);

    const res = await BillSlipHelper.getBillSlips({ company });

    expect(res).toEqual(billsSlipList);
    sinon.assert.calledWithExactly(getBillsSlipList, company._id);
    sinon.assert.calledWithExactly(getCreditNoteList, company._id);
  });

  it('should add credit note if not same thirdPartyPayer as bills', async () => {
    const company = { _id: new ObjectID() };

    const billsSlipList = [
      { thirdPartyPayer: { _id: new ObjectID() }, month: '2020-01', netInclTaxes: 120 },
    ];
    getBillsSlipList.returns(billsSlipList);
    const creditNotesSlipList = [
      { thirdPartyPayer: { _id: billsSlipList[0].thirdPartyPayer._id }, month: '2020-02', netInclTaxes: 11 },
    ];
    getCreditNoteList.returns(creditNotesSlipList);

    const res = await BillSlipHelper.getBillSlips({ company });
    expect(res.length).toEqual(2);
    sinon.assert.calledWithExactly(getBillsSlipList, company._id);
    sinon.assert.calledWithExactly(getCreditNoteList, company._id);
  });
});

describe('formatBillSlipNumber', () => {
  it('should format bill slip number', () => {
    expect(BillSlipHelper.formatBillSlipNumber(123, 12, 2)).toEqual('BORD-1231200002');
    expect(BillSlipHelper.formatBillSlipNumber(123, 12, 987652)).toEqual('BORD-12312987652');
  });
});

describe('getBillSlipNumber', () => {
  let BillSlipNumberMock;
  beforeEach(() => {
    BillSlipNumberMock = sinon.mock(BillSlipNumber);
  });
  afterEach(() => {
    BillSlipNumberMock.restore();
  });

  it('should return bill slip number', async () => {
    const endDate = '2019-09-12T06:00:00';
    const company = { _id: new ObjectID() };
    BillSlipNumberMock.expects('findOneAndUpdate')
      .withExactArgs(
        { prefix: '0919', company: company._id },
        {},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      .chain('lean')
      .once()
      .returns('1234567890');

    const result = await BillSlipHelper.getBillSlipNumber(endDate, company._id);

    expect(result).toEqual('1234567890');
    BillSlipNumberMock.verify();
  });
});

describe('createBillSlips', () => {
  let BillSlipMock;
  let getBillSlipNumber;
  let formatBillSlipNumber;
  let updateOneBillSlipNumber;
  beforeEach(() => {
    BillSlipMock = sinon.mock(BillSlip);
    getBillSlipNumber = sinon.stub(BillSlipHelper, 'getBillSlipNumber');
    formatBillSlipNumber = sinon.stub(BillSlipHelper, 'formatBillSlipNumber');
    updateOneBillSlipNumber = sinon.stub(BillSlipNumber, 'updateOne');
  });
  afterEach(() => {
    BillSlipMock.restore();
    getBillSlipNumber.restore();
    formatBillSlipNumber.restore();
    updateOneBillSlipNumber.restore();
  });

  it('should not create new bill slip', async () => {
    const thirdPartyPayer1 = new ObjectID();
    const thirdPartyPayer2 = new ObjectID();
    const billList = [{ thirdPartyPayer: thirdPartyPayer1 }, { thirdPartyPayer: thirdPartyPayer2 }];
    const company = { _id: new ObjectID() };
    BillSlipMock.expects('find')
      .withExactArgs(
        { thirdPartyPayer: { $in: [thirdPartyPayer1, thirdPartyPayer2] }, month: '09-2019', company: company._id }
      )
      .chain('lean')
      .once()
      .returns([{ _id: new ObjectID() }, { _id: new ObjectID() }]);
    BillSlipMock.expects('insertMany').never();

    const result = await BillSlipHelper.createBillSlips(billList, '2019-09-12T00:00:00', company);

    expect(result).toBeUndefined();
    sinon.assert.notCalled(getBillSlipNumber);
    sinon.assert.notCalled(formatBillSlipNumber);
    sinon.assert.notCalled(updateOneBillSlipNumber);
    BillSlipMock.verify();
  });
  it('should create new bill slips', async () => {
    const thirdPartyPayer1 = new ObjectID();
    const thirdPartyPayer2 = new ObjectID();
    const billList = [{ thirdPartyPayer: thirdPartyPayer1 }, { thirdPartyPayer: thirdPartyPayer2 }];
    const company = { _id: new ObjectID(), prefixNumber: 129 };
    const endDate = '2019-09-12T00:00:00';
    BillSlipMock.expects('find')
      .withExactArgs({
        thirdPartyPayer: { $in: [thirdPartyPayer1, thirdPartyPayer2] },
        month: '09-2019',
        company: company._id,
      })
      .chain('lean')
      .once()
      .returns([]);
    getBillSlipNumber.returns({ seq: 12, prefix: 'ASD' });
    formatBillSlipNumber.onCall(0).returns('BORD-129ASD00012');
    formatBillSlipNumber.onCall(1).returns('BORD-129ASD00013');
    BillSlipMock.expects('insertMany')
      .withExactArgs([
        { company: company._id, month: '09-2019', thirdPartyPayer: thirdPartyPayer1, number: 'BORD-129ASD00012' },
        { company: company._id, month: '09-2019', thirdPartyPayer: thirdPartyPayer2, number: 'BORD-129ASD00013' },
      ])
      .once();

    await BillSlipHelper.createBillSlips(billList, endDate, company);

    sinon.assert.calledWithExactly(getBillSlipNumber, endDate, company._id);
    sinon.assert.calledWithExactly(formatBillSlipNumber.getCall(0), 129, 'ASD', 12);
    sinon.assert.calledWithExactly(formatBillSlipNumber.getCall(1), 129, 'ASD', 13);
    sinon.assert.calledWithExactly(
      updateOneBillSlipNumber,
      { prefix: '0919', company: company._id },
      { $set: { seq: 14 } }
    );
    BillSlipMock.verify();
  });

  it('should create new bill slips from a creditNote', async () => {
    const thirdPartyPayer1 = new ObjectID();
    const thirdPartyPayer2 = new ObjectID();
    const billList = [{ thirdPartyPayer: thirdPartyPayer1 }, { thirdPartyPayer: thirdPartyPayer2 }];
    const company = { _id: new ObjectID(), prefixNumber: 129 };
    const endDate = '2019-09-12T00:00:00';
    BillSlipMock.expects('find')
      .withExactArgs({
        thirdPartyPayer: { $in: [thirdPartyPayer1, thirdPartyPayer2] },
        month: '09-2019',
        company: company._id,
      })
      .chain('lean')
      .once()
      .returns([]);
    getBillSlipNumber.returns({ seq: 12, prefix: 'ASD' });
    formatBillSlipNumber.onCall(0).returns('BORD-129ASD00012');
    formatBillSlipNumber.onCall(1).returns('BORD-129ASD00013');
    BillSlipMock.expects('insertMany')
      .withExactArgs([
        { company: company._id, month: '09-2019', thirdPartyPayer: thirdPartyPayer1, number: 'BORD-129ASD00012' },
        { company: company._id, month: '09-2019', thirdPartyPayer: thirdPartyPayer2, number: 'BORD-129ASD00013' },
      ])
      .once();

    await BillSlipHelper.createBillSlips(billList, endDate, company);

    sinon.assert.calledWithExactly(getBillSlipNumber, endDate, company._id);
    sinon.assert.calledWithExactly(formatBillSlipNumber.getCall(0), 129, 'ASD', 12);
    sinon.assert.calledWithExactly(formatBillSlipNumber.getCall(1), 129, 'ASD', 13);
    sinon.assert.calledWithExactly(
      updateOneBillSlipNumber,
      { prefix: '0919', company: company._id },
      { $set: { seq: 14 } }
    );
    BillSlipMock.verify();
  });
});

describe('formatFundingInfo', () => {
  let formatPercentage;
  let formatHour;
  let formatPrice;
  let mergeLastVersionWithBaseObject;
  beforeEach(() => {
    formatPercentage = sinon.stub(UtilsHelper, 'formatPercentage');
    formatHour = sinon.stub(UtilsHelper, 'formatHour');
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
    mergeLastVersionWithBaseObject = sinon.stub(UtilsHelper, 'mergeLastVersionWithBaseObject');
  });
  afterEach(() => {
    formatPercentage.restore();
    formatHour.restore();
    formatPrice.restore();
    mergeLastVersionWithBaseObject.restore();
  });
  it('should format funding and bill info', () => {
    const fundingId = new ObjectID();
    const bill = {
      number: 'FACT-1234567890',
      date: '2019-09-18T09:00:00',
      createdAt: '2019-09-12T09:00:00',
      customer: {
        identity: { lastname: 'Toto' },
        fundings: [{ _id: fundingId, versions: [{ _id: new ObjectID() }], frequency: 'monthly' }],
      },
    };
    const billingDoc = { fundingId, careHours: 2, inclTaxesTpp: 12 };
    const matchingVersion = { folderNumber: 'folder', customerParticipationRate: 40, careHours: 12, unitTTCRate: 24 };
    formatPercentage.returnsArg(0);
    formatPrice.returnsArg(0);
    formatHour.returnsArg(0);
    mergeLastVersionWithBaseObject.returns(matchingVersion);

    const result = BillSlipHelper.formatFundingInfo(bill, billingDoc);

    expect(result).toEqual({
      number: 'FACT-1234567890',
      date: '18/09/2019',
      createdAt: '2019-09-12T09:00:00',
      customer: 'Toto',
      folderNumber: 'folder',
      customerParticipationRate: 0.4,
      tppParticipationRate: 0.6,
      careHours: 12,
      unitTTCRate: 24,
      billedCareHours: 0,
      netInclTaxes: 0,
    });
    sinon.assert.calledWithExactly(mergeLastVersionWithBaseObject, bill.customer.fundings[0], 'createdAt');
  });
});

describe('formatBillingDataForFile', () => {
  let formatFundingInfo;
  let formatPrice;
  let formatHour;
  beforeEach(() => {
    formatFundingInfo = sinon.stub(BillSlipHelper, 'formatFundingInfo');
    formatPrice = sinon.stub(UtilsHelper, 'formatPrice');
    formatHour = sinon.stub(UtilsHelper, 'formatHour');
  });
  afterEach(() => {
    formatFundingInfo.restore();
    formatPrice.restore();
    formatHour.restore();
  });

  it('should return 0 and [] if [] given', () => {
    const billList = [];

    formatPrice.returnsArg(0);

    const result = BillSlipHelper.formatBillingDataForFile(billList, []);

    expect(result.total).toEqual(0);
    expect(result.formattedBills).toEqual([]);
    sinon.assert.notCalled(formatFundingInfo);
    sinon.assert.calledWithExactly(formatPrice, 0);
    sinon.assert.notCalled(formatHour);
  });

  it('should format bills for pdf', () => {
    const fundingId = new ObjectID();
    const fundings = [{ _id: fundingId, versions: [{ _id: new ObjectID() }], frequency: 'monthly' }];
    const event = { fundingId, careHours: 2, inclTaxesTpp: 12 };
    const billList = [
      {
        createdAt: moment('2020-01-01').toDate(),
        number: 'number',
        customer: { fundings, identity: { firstname: 'abc' } },
        subscriptions: [{ events: [event] }],
      },
    ];
    const eventCreditNote = { bills: { fundingId, inclTaxesTpp: 12, careHours: 2 } };
    const creditNoteList = [
      {
        createdAt: moment('2020-01-04').toDate(),
        number: 'numberCreditNote',
        customer: { fundings, identity: { firstname: 'abc' } },
        events: [eventCreditNote],
      },
      {
        createdAt: moment('2020-01-03').toDate(),
        number: 'numberCreditNote2',
        customer: { fundings, identity: { firstname: 'zyx' } },
        events: [{ bills: { fundingId: new ObjectID(), inclTaxesTpp: 10, careHours: 1 } }],
      },
    ];

    formatFundingInfo.onCall(0).returns({
      billedCareHours: 0,
      netInclTaxes: 0,
      number: 'number',
      customer: 'abc',
      createdAt: moment('2020-01-01').toDate(),
    });
    formatFundingInfo.onCall(1).returns({
      billedCareHours: 0,
      netInclTaxes: 0,
      number: 'numberCreditNote',
      customer: 'abc',
      createdAt: moment('2020-01-04').toDate(),
    });
    formatFundingInfo.onCall(2).returns({
      billedCareHours: 0,
      netInclTaxes: 0,
      number: 'numberCreditNote2',
      customer: 'zyx',
      createdAt: moment('2020-01-03').toDate(),
    });
    formatPrice.returnsArg(0);
    formatHour.returnsArg(0);

    const result = BillSlipHelper.formatBillingDataForFile(billList, creditNoteList);

    expect(result.total).toEqual(-10);
    expect(result.formattedBills).toEqual([
      {
        billedCareHours: 2,
        netInclTaxes: 12,
        number: 'number',
        customer: 'abc',
        createdAt: moment('2020-01-01').toDate(),
      },
      {
        billedCareHours: 2,
        netInclTaxes: -12,
        number: 'numberCreditNote',
        customer: 'abc',
        createdAt: moment('2020-01-04').toDate(),
      },
      {
        billedCareHours: 1,
        netInclTaxes: -10,
        number: 'numberCreditNote2',
        customer: 'zyx',
        createdAt: moment('2020-01-03').toDate(),
      },
    ]);
    sinon.assert.calledWithExactly(formatFundingInfo.getCall(0), billList[0], event);
    sinon.assert.calledWithExactly(formatFundingInfo.getCall(1), creditNoteList[0], eventCreditNote.bills);
    sinon.assert.calledWithExactly(formatFundingInfo.getCall(2), creditNoteList[1], creditNoteList[1].events[0].bills);
    sinon.assert.calledWithExactly(formatPrice.getCall(0), 12);
    sinon.assert.calledWithExactly(formatPrice.getCall(1), -12);
    sinon.assert.calledWithExactly(formatPrice.getCall(2), -10);
    sinon.assert.calledWithExactly(formatHour.getCall(0), 2);
    sinon.assert.calledWithExactly(formatHour.getCall(1), 2);
    sinon.assert.calledWithExactly(formatHour.getCall(2), 1);
  });
});

describe('formatFile', () => {
  let formatBillingDataForFile;
  beforeEach(() => {
    formatBillingDataForFile = sinon.stub(BillSlipHelper, 'formatBillingDataForFile');
  });
  afterEach(() => {
    formatBillingDataForFile.restore();
  });

  it('should return formatted data for pdf generation', async () => {
    const company = {
      iban: 'FR8512739000305678847384Q97',
      bic: 'AGFBFRCC',
      rcs: '530514157',
      billingAssistance: 'support@alenvi.io',
      address: { fullAddress: '10 rue des cathédrales 75007 Paris' },
      logo: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png',
    };
    const billSlip = {
      number: 'BORD-1234567890',
      thirdPartyPayer: { name: 'Diocèse de Paris' },
      month: '12-2019',
    };
    const billList = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
    const creditNoteList = [{ _id: new ObjectID() }];
    formatBillingDataForFile.returns({ total: 100, formattedBills: [{ bills: 'bills' }] });

    const result = await BillSlipHelper.formatFile(billSlip, billList, creditNoteList, company);

    expect(result).toEqual({
      billSlip: {
        number: billSlip.number,
        thirdPartyPayer: billSlip.thirdPartyPayer,
        company: {
          iban: company.iban,
          bic: company.bic,
          rcs: company.rcs,
          address: company.address.fullAddress,
          logo: company.logo,
          email: 'support@alenvi.io',
          website: 'www.alenvi.io',
        },
        date: expect.stringMatching(/^\d\d\/\d\d\/\d\d\d\d$/),
        period: { start: '01/12/2019', end: '31/12/2019' },
        total: 100,
        formattedBills: [{ bills: 'bills' }],
      },
    });
    sinon.assert.calledWithExactly(formatBillingDataForFile, billList, creditNoteList);
  });

  it('should empty strimg for email if company does not have one', async () => {
    const company = {
      iban: 'FR8512739000305678847384Q97',
      bic: 'AGFBFRCC',
      rcs: '530514157',
      address: { fullAddress: '10 rue des cathédrales 75007 Paris' },
      logo: 'https://storage.googleapis.com/compani-main/alenvi_logo_183x50.png',
    };
    const billSlip = {
      number: 'BORD-1234567890',
      thirdPartyPayer: { name: 'Diocèse de Paris' },
      month: '12-2019',
    };
    const billList = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
    const creditNoteList = [{ _id: new ObjectID() }];
    formatBillingDataForFile.returns({ total: 100, formattedBills: [{ bills: 'bills' }] });

    const result = await BillSlipHelper.formatFile(billSlip, billList, creditNoteList, company);

    expect(result).toEqual({
      billSlip: {
        number: billSlip.number,
        thirdPartyPayer: billSlip.thirdPartyPayer,
        company: {
          iban: company.iban,
          bic: company.bic,
          rcs: company.rcs,
          address: company.address.fullAddress,
          logo: company.logo,
          email: '',
          website: 'www.alenvi.io',
        },
        date: expect.stringMatching(/^\d\d\/\d\d\/\d\d\d\d$/),
        period: { start: '01/12/2019', end: '31/12/2019' },
        total: 100,
        formattedBills: [{ bills: 'bills' }],
      },
    });
    sinon.assert.calledWithExactly(formatBillingDataForFile, billList, creditNoteList);
  });
});

describe('generateFile', () => {
  let BillSlipMock;
  let createDocxStub;
  let formatFileStub;
  let getBillsFromBillSlip;
  let getCreditNoteFromBillSlip;
  const billSlip = { _id: new ObjectID(), number: 'BORD-1234567890' };
  const billSlipData = { billSlip: { number: '123467890' } };
  const credentials = { company: { _id: new ObjectID() } };
  const docx = 'This is a docx file';
  const billList = [{ _id: new ObjectID() }];
  const creditNoteList = [{ _id: new ObjectID() }];
  beforeEach(() => {
    BillSlipMock = sinon.mock(BillSlip);
    getBillsFromBillSlip = sinon.stub(BillRepository, 'getBillsFromBillSlip');
    getCreditNoteFromBillSlip = sinon.stub(CreditNoteRepository, 'getCreditNoteFromBillSlip');
    createDocxStub = sinon.stub(DocxHelper, 'createDocx');
    formatFileStub = sinon.stub(BillSlipHelper, 'formatFile');
  });
  afterEach(() => {
    BillSlipMock.restore();
    createDocxStub.restore();
    formatFileStub.restore();
    getBillsFromBillSlip.restore();
    getCreditNoteFromBillSlip.restore();
  });

  it('should return generated pdf and bill slip number', async () => {
    BillSlipMock.expects('findById')
      .withExactArgs(billSlip._id)
      .chain('populate')
      .withExactArgs('thirdPartyPayer')
      .chain('lean')
      .once()
      .returns(billSlip);
    getBillsFromBillSlip.returns(billList);
    getCreditNoteFromBillSlip.returns(creditNoteList);
    createDocxStub.returns(docx);
    formatFileStub.returns(billSlipData);

    const result = await BillSlipHelper.generateFile(billSlip._id, credentials);

    expect(result).toMatchObject({
      billSlipNumber: billSlip.number,
      file: docx,
    });
    BillSlipMock.restore();
    sinon.assert.calledWithExactly(formatFileStub, billSlip, billList, creditNoteList, credentials.company);
    sinon.assert.calledWithExactly(getBillsFromBillSlip, billSlip, credentials.company._id);
    sinon.assert.calledWithExactly(
      createDocxStub,
      path.join(process.cwd(), 'src/data/billSlip.docx'),
      billSlipData
    );
    BillSlipMock.verify();
  });
});
