const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const SinonMongoose = require('../sinonMongoose');
const CourseCreditNoteHelper = require('../../../src/helpers/courseCreditNote');
const CourseCreditNote = require('../../../src/models/CourseCreditNote');
const CourseCreditNoteNumber = require('../../../src/models/CourseCreditNoteNumber');

describe('createCourseCreditNote', () => {
  let create;
  let findOneAndUpdateCourseCreditNoteNumber;

  beforeEach(() => {
    create = sinon.stub(CourseCreditNote, 'create');
    findOneAndUpdateCourseCreditNoteNumber = sinon.stub(CourseCreditNoteNumber, 'findOneAndUpdate');
  });

  afterEach(() => {
    create.restore();
    findOneAndUpdateCourseCreditNoteNumber.restore();
  });

  it('should create a credit note', async () => {
    const payload = {
      date: '2022-03-08T00:00:00.000Z',
      company: new ObjectId(),
      customerBill: new ObjectId(),
      misc: 'salut',
    };
    const lastPaymentNumber = { seq: 1 };

    findOneAndUpdateCourseCreditNoteNumber.returns(SinonMongoose.stubChainedQueries(lastPaymentNumber, ['lean']));

    await CourseCreditNoteHelper.createCourseCreditNote(payload);
    sinon.assert.calledOnceWithExactly(create, { ...payload, number: 'AV-00001' });
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdateCourseCreditNoteNumber,
      [
        {
          query: 'findOneAndUpdate',
          args: [{}, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }],
        },
        { query: 'lean' },
      ]);
  });
});
