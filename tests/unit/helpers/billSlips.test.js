const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const BillSlipHelper = require('../../../src/helpers/billSlips');
const BillSlipNumber = require('../../../src/models/BillSlipNumber');
const BillRepository = require('../../../src/repositories/BillRepository');
const BillSlip = require('../../../src/models/BillSlip');
const PdfHelper = require('../../../src/helpers/pdf');

require('sinon-mongoose');

describe('getBillSlips', () => {
  let getBillsSlipList;
  beforeEach(() => {
    getBillsSlipList = sinon.stub(BillRepository, 'getBillsSlipList');
  });
  afterEach(() => {
    getBillsSlipList.restore();
  });

  it('should return bill slips list', async () => {
    const company = { _id: new ObjectID() };

    await BillSlipHelper.getBillSlips({ company });

    sinon.assert.calledWithExactly(getBillsSlipList, company._id);
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

    const result = await BillSlipHelper.getBillSlipNumber(endDate, company);

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
    const client1 = new ObjectID();
    const client2 = new ObjectID();
    const billList = [{ client: client1 }, { client: client2 }];
    const company = { _id: new ObjectID() };
    BillSlipMock.expects('find')
      .withExactArgs({ thirdPartyPayer: { $in: [client1, client2] }, month: '09-2019', company: company._id })
      .chain('lean')
      .once()
      .returns([{ _id: new ObjectID() }, { _id: new ObjectID() }]);
    BillSlipMock.expects('insertMany').never();

    const result = await BillSlipHelper.createBillSlips(billList, '2019-09-12T00:00:00', company);

    expect(result).not.toBeDefined();
    sinon.assert.notCalled(getBillSlipNumber);
    sinon.assert.notCalled(formatBillSlipNumber);
    sinon.assert.notCalled(updateOneBillSlipNumber);
    BillSlipMock.verify();
  });
  it('should create new bill slips', async () => {
    const client1 = new ObjectID();
    const client2 = new ObjectID();
    const billList = [{ client: client1 }, { client: client2 }];
    const company = { _id: new ObjectID(), prefixNumber: 129 };
    const endDate = '2019-09-12T00:00:00';
    BillSlipMock.expects('find')
      .withExactArgs({ thirdPartyPayer: { $in: [client1, client2] }, month: '09-2019', company: company._id })
      .chain('lean')
      .once()
      .returns([]);
    getBillSlipNumber.returns({ seq: 12, prefix: 'ASD' });
    formatBillSlipNumber.onCall(0).returns('BORD-129ASD00012');
    formatBillSlipNumber.onCall(1).returns('BORD-129ASD00013');
    BillSlipMock.expects('insertMany')
      .withExactArgs([
        { company: company._id, month: '09-2019', thirdPartyPayer: client1, number: 'BORD-129ASD00012' },
        { company: company._id, month: '09-2019', thirdPartyPayer: client2, number: 'BORD-129ASD00013' },
      ])
      .once();

    await BillSlipHelper.createBillSlips(billList, endDate, company);

    sinon.assert.calledWithExactly(getBillSlipNumber, endDate, company);
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

describe('generatePdf', () => {
  let BillSlipMock;
  let generatePdfStub;
  const billSlip = { _id: new ObjectID(), number: 'BORD-1234567890' };
  const pdf = 'This is a pdf';

  beforeEach(() => {
    BillSlipMock = sinon.mock(BillSlip);
    generatePdfStub = sinon.stub(PdfHelper, 'generatePdf');
  });

  afterEach(() => {
    BillSlipMock.restore();
    generatePdfStub.restore();
  });

  it('should return generated pdf and bill slip number', async () => {
    BillSlipMock
      .expects('findById')
      .withExactArgs(billSlip._id)
      .chain('lean')
      .once()
      .returns(billSlip);
    generatePdfStub.returns(pdf);

    const result = await BillSlipHelper.generatePdf(billSlip._id);

    expect(result).toMatchObject({
      billSlipNumber: billSlip.number,
      pdf,
    });
    BillSlipMock.restore();
    sinon.assert.calledWithExactly(
      generatePdfStub,
      {},
      './src/data/billSlip.html',
      { format: 'A4', printBackground: true, landscape: true }
    );
  });
});
