const sinon = require('sinon');

const stubChainedQueries = (stubbedMethodReturns, chainedQueries = ['populate', 'lean']) => {
  const chainedQueriesStubs = {};
  const chainedQueriesCount = chainedQueries.length;

  for (let i = 0; i < chainedQueriesCount - 1; i++) {
    chainedQueriesStubs[chainedQueries[i]] = sinon.stub().returnsThis();
  }

  let lastChainedQueryStub = sinon.stub();
  for (let i = 0; i < stubbedMethodReturns.length; i++) {
    lastChainedQueryStub = lastChainedQueryStub.onCall(i).returns(stubbedMethodReturns[i]);
  }

  chainedQueriesStubs[chainedQueries[chainedQueriesCount - 1]] = lastChainedQueryStub;

  return chainedQueriesStubs;
};

const calledWithExactly = (stubbedMethod, chainedPayload, callCount = 0) => {
  let chainedQuery = stubbedMethod;
  sinon.assert.calledWithExactly(chainedQuery.getCall(callCount), chainedPayload[0].args);

  for (let i = 1; i < chainedPayload.length; i++) {
    const { query, args } = chainedPayload[i];
    chainedQuery = chainedQuery.getCall(callCount).returnValue[query];

    sinon.assert.calledWithExactly(chainedQuery, args);
  }
};

module.exports = {
  stubChainedQueries,
  calledWithExactly,
};
