const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const CoursePaymentsHelper = require('../../../src/helpers/coursePayments');
const { PAYMENT, DIRECT_DEBIT } = require('../../../src/helpers/constants');
const CoursePaymentNumber = require('../../../src/models/CoursePaymentNumber');
const CoursePayment = require('../../../src/models/CoursePayment');
const SinonMongoose = require('../sinonMongoose');

describe('createCoursePayment', () => {
  let create;
  let findOneAndUpdateCoursePaymentsNumber;

  beforeEach(() => {
    create = sinon.stub(CoursePayment, 'create');
    findOneAndUpdateCoursePaymentsNumber = sinon.stub(CoursePaymentNumber, 'findOneAndUpdate');
  });

  afterEach(() => {
    create.restore();
    findOneAndUpdateCoursePaymentsNumber.restore();
  });

  it('should create a payment', async () => {
    const payload = {
      date: '2019-11-28',
      company: new ObjectId(),
      customerBill: new ObjectId(),
      netInclTaxes: 190,
      nature: PAYMENT,
      type: DIRECT_DEBIT,
    };
    const lastPaymentNumber = { seq: 1 };

    findOneAndUpdateCoursePaymentsNumber.returns(SinonMongoose.stubChainedQueries(lastPaymentNumber, ['lean']));

    await CoursePaymentsHelper.createCoursePayment(payload);
    sinon.assert.calledOnceWithExactly(create, { ...payload, number: 'REG-00001' });
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdateCoursePaymentsNumber,
      [
        {
          query: 'findOneAndUpdate',
          args: [{}, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }],
        },
        { query: 'lean' },
      ]);
  });
});
