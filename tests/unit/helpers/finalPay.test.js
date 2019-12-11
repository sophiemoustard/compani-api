const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const FinalPay = require('../../../src/models/FinalPay');
const PayHelper = require('../../../src/helpers/pay');
const FinalPayHelper = require('../../../src/helpers/finalPay');
require('sinon-mongoose');

describe('createFinalPayList', () => {
  const credentials = { company: { _id: new ObjectID() } };
  let formatPayStub;
  let FinalPayModel;
  beforeEach(() => {
    formatPayStub = sinon.stub(PayHelper, 'formatPay');
    FinalPayModel = sinon.mock(FinalPay);
  });
  afterEach(() => {
    formatPayStub.restore();
    FinalPayModel.restore();
  });

  it('should create pay', async () => {
    const finalPayToCreate = [{ _id: new ObjectID() }];
    formatPayStub.returns(finalPayToCreate[0]);
    FinalPayModel.expects('insertMany').withExactArgs([new FinalPay(finalPayToCreate[0])]);

    await FinalPayHelper.createFinalPayList(finalPayToCreate, credentials);
    sinon.assert.calledWithExactly(formatPayStub, finalPayToCreate[0], credentials.company._id);
  });
});
