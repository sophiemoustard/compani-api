const expect = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const has = require('lodash/has');
const CourseBill = require('../../../src/models/CourseBill');
const CourseBillHelper = require('../../../src/helpers/courseBills');
const PdfHelper = require('../../../src/helpers/pdf');
const CourseBillPdf = require('../../../src/data/pdf/courseBilling/courseBill');
const SinonMongoose = require('../sinonMongoose');
const CourseBillsNumber = require('../../../src/models/CourseBillsNumber');

describe('getNetInclTaxes', () => {
  it('should return total price (without billing purchases)', async () => {
    const bill = { course: new ObjectId(), company: { name: 'Company' }, mainFee: { price: 120, count: 2 } };

    const result = await CourseBillHelper.getNetInclTaxes(bill);
    expect(result).toEqual(240);
  });

  it('should return total price (with billing purchases)', async () => {
    const bill = {
      course: new ObjectId(),
      company: { name: 'Company' },
      mainFee: { price: 120, count: 2 },
      billingPurchaseList: [
        { billingItem: new ObjectId(), price: 90, count: 1 },
        { billingItem: new ObjectId(), price: 400, count: 1 },
      ],
    };

    const result = await CourseBillHelper.getNetInclTaxes(bill);
    expect(result).toEqual(730);
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(CourseBill, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return all course bills (without billing purchases)', async () => {
    const courseId = new ObjectId();
    const credentials = { role: { vendor: new ObjectId() } };
    const courseBills = [
      {
        course: courseId,
        company: { name: 'Company' },
        mainFee: { price: 120, count: 2 },
        courseFundingOrganisation: { name: 'Funder' },
      },
    ];
    find.returns(SinonMongoose.stubChainedQueries(courseBills, ['populate', 'setOptions', 'lean']));

    const result = await CourseBillHelper.list(courseId, credentials);

    expect(result).toEqual([{
      course: courseId,
      company: { name: 'Company' },
      mainFee: { price: 120, count: 2 },
      courseFundingOrganisation: { name: 'Funder' },
      netInclTaxes: 240,
    }]);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId }] },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        { query: 'populate', args: [{ path: 'courseFundingOrganisation', select: 'name' }] },
        { query: 'setOptions', args: [{ isVendorUser: has(credentials, 'role.vendor') }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return all course bills (with billing purchases)', async () => {
    const courseId = new ObjectId();

    const credentials = { role: { vendor: new ObjectId() } };
    const billingItemList = [{ _id: new ObjectId(), name: 'article 1' }, { _id: new ObjectId(), name: 'article 2' }];
    const courseBills = [
      {
        course: courseId,
        company: { name: 'Company' },
        mainFee: { price: 120, count: 2 },
        courseFundingOrganisation: { name: 'Funder' },
        billingPurchaseList: [
          { billingItem: billingItemList[0]._id, price: 90, count: 1 },
          { billingItem: billingItemList[1]._id, price: 400, count: 1 },
        ],
      },
    ];
    find.returns(SinonMongoose.stubChainedQueries(courseBills, ['populate', 'setOptions', 'lean']));

    const result = await CourseBillHelper.list(courseId, credentials);

    expect(result).toEqual([{
      course: courseId,
      company: { name: 'Company' },
      mainFee: { price: 120, count: 2 },
      courseFundingOrganisation: { name: 'Funder' },
      billingPurchaseList: [
        { billingItem: billingItemList[0]._id, price: 90, count: 1 },
        { billingItem: billingItemList[1]._id, price: 400, count: 1 },
      ],
      netInclTaxes: 730,
    }]);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId }] },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        { query: 'populate', args: [{ path: 'courseFundingOrganisation', select: 'name' }] },
        { query: 'setOptions', args: [{ isVendorUser: has(credentials, 'role.vendor') }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('create', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(CourseBill, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create a course bill', async () => {
    const payload = {
      course: new ObjectId(),
      company: new ObjectId(),
      mainFee: { price: 120, count: 1 },
      courseFundingOrganisation: new ObjectId(),
    };
    await CourseBillHelper.create(payload);

    sinon.assert.calledOnceWithExactly(create, payload);
  });
});

describe('updateCourseBill', () => {
  let updateOne;
  let findOneAndUpdateCourseBillsNumber;

  beforeEach(() => {
    updateOne = sinon.stub(CourseBill, 'updateOne');
    findOneAndUpdateCourseBillsNumber = sinon.stub(CourseBillsNumber, 'findOneAndUpdate');
  });

  afterEach(() => {
    updateOne.restore();
    findOneAndUpdateCourseBillsNumber.restore();
  });

  it('should update a course bill funder', async () => {
    const courseBillId = new ObjectId();
    const payload = { courseFundingOrganisation: new ObjectId() };
    await CourseBillHelper.updateCourseBill(courseBillId, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: courseBillId }, { $set: payload });
    sinon.assert.notCalled(findOneAndUpdateCourseBillsNumber);
  });

  it('should remove a course bill funder', async () => {
    const courseBillId = new ObjectId();
    const payload = { courseFundingOrganisation: '' };
    await CourseBillHelper.updateCourseBill(courseBillId, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: courseBillId }, { $unset: payload });
    sinon.assert.notCalled(findOneAndUpdateCourseBillsNumber);
  });

  it('should update a course bill mainFee', async () => {
    const courseBillId = new ObjectId();
    const payload = { 'mainFee.price': 200, 'mainFee.count': 1, description: 'skududu skududu' };
    await CourseBillHelper.updateCourseBill(courseBillId, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: courseBillId }, { $set: payload });
    sinon.assert.notCalled(findOneAndUpdateCourseBillsNumber);
  });

  it('should remove a course bill mainFee description', async () => {
    const courseBillId = new ObjectId();
    const payload = { mainFee: { price: 200, count: 1, description: '' } };
    await CourseBillHelper.updateCourseBill(courseBillId, payload);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: courseBillId },
      { $set: { 'mainFee.price': 200, 'mainFee.count': 1 }, $unset: { 'mainFee.description': '' } }
    );
    sinon.assert.notCalled(findOneAndUpdateCourseBillsNumber);
  });

  it('should invoice bill', async () => {
    const courseBillId = new ObjectId();
    const payload = { billedAt: '2022-03-08T00:00:00.000Z' };
    const lastBillNumber = { seq: 1 };

    findOneAndUpdateCourseBillsNumber.returns(SinonMongoose.stubChainedQueries(lastBillNumber, ['lean']));

    await CourseBillHelper.updateCourseBill(courseBillId, payload);

    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdateCourseBillsNumber,
      [
        {
          query: 'findOneAndUpdate',
          args: [{}, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }],
        },
        { query: 'lean' },
      ]);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: courseBillId },
      { $set: { billedAt: payload.billedAt, number: `FACT-${lastBillNumber.seq.toString().padStart(5, '0')}` } }
    );
  });
});

describe('addBillingPurchase', () => {
  let updateOne;

  beforeEach(() => {
    updateOne = sinon.stub(CourseBill, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should add a course bill item to course bill', async () => {
    const courseBillId = new ObjectId();

    const payload = {
      billingItem: new ObjectId(),
      price: 120,
      count: 1,
      description: 'billing item for test',
    };
    await CourseBillHelper.addBillingPurchase(courseBillId, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: courseBillId }, { $push: { billingPurchaseList: payload } });
  });
});

describe('updateBillingPurchase', () => {
  let updateOne;

  beforeEach(() => {
    updateOne = sinon.stub(CourseBill, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should update purchase with description', async () => {
    const courseBillId = new ObjectId();
    const billingPurchaseId = new ObjectId();

    const payload = { price: 120, count: 1, description: 'billing item for test' };
    await CourseBillHelper.updateBillingPurchase(courseBillId, billingPurchaseId, payload);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: courseBillId, 'billingPurchaseList._id': billingPurchaseId },
      {
        $set: {
          'billingPurchaseList.$.price': 120,
          'billingPurchaseList.$.count': 1,
          'billingPurchaseList.$.description': 'billing item for test',
        },
      }
    );
  });

  it('should update purchase and remove description', async () => {
    const courseBillId = new ObjectId();
    const billingPurchaseId = new ObjectId();

    const payload = { price: 30, count: 2, description: '' };
    await CourseBillHelper.updateBillingPurchase(courseBillId, billingPurchaseId, payload);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: courseBillId, 'billingPurchaseList._id': billingPurchaseId },
      {
        $set: { 'billingPurchaseList.$.price': 30, 'billingPurchaseList.$.count': 2 },
        $unset: { 'billingPurchaseList.$.description': '' },
      }
    );
  });
});

describe('generateBillPdf', () => {
  let findOne;
  let getPdfContent;
  let generatePdf;

  beforeEach(() => {
    findOne = sinon.stub(CourseBill, 'findOne');
    getPdfContent = sinon.stub(CourseBillPdf, 'getPdfContent');
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
  });

  afterEach(() => {
    findOne.restore();
    getPdfContent.restore();
    generatePdf.restore();
  });

  it('should download course bill', async () => {
    const billId = new ObjectId();

    const bill = {
      _id: new ObjectId(),
      course: {
        _id: new ObjectId(),
        subProgram: { _id: new ObjectId(), program: { _id: new ObjectId(), name: 'Test' } },
      },
      mainFee: { price: 1000, count: 1 },
      billingPurchaseList: [
        { billingItem: { _id: new ObjectId(), name: 'article 1' }, price: 10, count: 10 },
        { billingItem: { _id: new ObjectId(), name: 'article 2' }, price: 20, count: 10 },
      ],
      number: 'FACT-00001',
      billedAt: '2022-03-08T00:00:00.000Z',
    };

    findOne.returns(SinonMongoose.stubChainedQueries(bill));
    getPdfContent.returns({ content: [{ text: 'data' }] });
    generatePdf.returns({ pdf: 'pdf' });

    const result = await CourseBillHelper.generateBillPdf(billId);
    expect(result).toEqual({ billNumber: bill.number, pdf: { pdf: 'pdf' } });
    sinon.assert.calledOnceWithExactly(
      getPdfContent,
      {
        course: bill.course,
        mainFee: bill.mainFee,
        billingPurchaseList: bill.billingPurchaseList,
      }
    );
    sinon.assert.calledWithExactly(generatePdf, { content: [{ text: 'data' }] });
    SinonMongoose.calledOnceWithExactly(findOne,
      [
        { query: 'findOne', args: [{ _id: billId }] },
        {
          query: 'populate',
          args: [{
            path: 'course',
            select: 'subProgram',
            populate: { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'billingPurchaseList', select: 'billingItem', populate: { path: 'billingItem', select: 'name' },
          }],
        },
        { query: 'lean' },
      ]);
  });
});
