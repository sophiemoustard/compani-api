const sinon = require('sinon');
const get = require('lodash/get');

const checkSinon = (Stub, skusku) => {
  let { query } = skusku[0];
  sinon.assert.calledWithExactly(Stub, skusku[0].arg);

  for (let i = 1; i < skusku.length; i++) {
    query = `${query}.getCall(0).returnValue.${skusku[i].query}`;

    sinon.assert.calledWithExactly(get(Stub, query), skusku[i].arg); // ne marche pas
  }
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
