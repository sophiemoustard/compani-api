const sinon = require('sinon');

const checkSinon = (ActivityStub, id) => {
  sinon.assert.calledWithExactly(ActivityStub, { _id: id });
  sinon.assert.calledWithExactly(
    ActivityStub.getCall(0).returnValue.populate,
    { path: 'cards', select: '-__v -createdAt -updatedAt' }
  );
  sinon.assert.calledWithExactly(
    ActivityStub.getCall(0).returnValue.populate.getCall(0).returnValue.populate,
    {
      path: 'steps',
      select: '_id -activities',
      populate:
        { path: 'subProgram', select: '_id -steps', populate: { path: 'program', select: 'name -subPrograms' } },
    }
  );
  sinon.assert.calledWithExactly(
    ActivityStub.getCall(0).returnValue.populate.getCall(0).returnValue.populate.getCall(0).returnValue.lean,
    { virtuals: true }
  );
};

const chainedMongoose = (returnedValues) => {
  let previousReturned = sinon.stub().onCall(0).returns(returnedValues[0]);
  for (let i = 1; i < returnedValues.length; i++) {
    previousReturned = previousReturned.onCall(i).returns(returnedValues[i]);
  }

  return {
    populate: sinon.stub().returnsThis(),
    lean: previousReturned,
  };
};

module.exports = {
  checkSinon,
  chainedMongoose,
};
