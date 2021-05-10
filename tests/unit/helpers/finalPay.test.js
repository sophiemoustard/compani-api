const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const FinalPay = require('../../../src/models/FinalPay');
const PayHelper = require('../../../src/helpers/pay');
const FinalPayHelper = require('../../../src/helpers/finalPay');

describe('createFinalPayList', () => {
  const credentials = { company: { _id: new ObjectID() } };
  let formatPayStub;
  let insertMany;
  beforeEach(() => {
    formatPayStub = sinon.stub(PayHelper, 'formatPay');
    insertMany = sinon.stub(FinalPay, 'insertMany');
  });
  afterEach(() => {
    formatPayStub.restore();
    insertMany.restore();
  });

  it('should create pay', async () => {
    const finalPayToCreate = [{ _id: new ObjectID() }];

    formatPayStub.returns(finalPayToCreate[0]);

    await FinalPayHelper.createFinalPayList(finalPayToCreate, credentials);

    sinon.assert.calledWithExactly(formatPayStub, finalPayToCreate[0], credentials.company._id);
    sinon.assert.calledWithExactly(insertMany, [new FinalPay(finalPayToCreate[0])]);
  });
});
