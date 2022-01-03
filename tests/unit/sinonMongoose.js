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

  if (String(chainedQuery.getCall(0).proxy) !== chainedPayload[0].query) {
    sinon.assert.fail(`Error in principal query : ${String(chainedQuery.getCall(callCount).proxy)} expected`);
  }
  if (chainedPayload[0].args) {
    sinon.assert.calledWithExactly(chainedQuery.getCall(callCount), ...chainedPayload[0].args);
  } else sinon.assert.calledWithExactly(chainedQuery.getCall(callCount));

  for (let i = 1; i < chainedPayload.length; i++) {
    const { query, args } = chainedPayload[i];
    chainedQuery = chainedQuery.getCall(callCount).returnValue[query];
    if (!chainedQuery) sinon.assert.fail('Error in secondary queries');
    if (args && args.length) sinon.assert.calledWithExactly(chainedQuery, ...args);
    else sinon.assert.calledWithExactly(chainedQuery);
  }
};

const calledOnceWithExactly = (stubbedMethod, chainedPayload) => {
  let chainedQuery = stubbedMethod;

  if (String(chainedQuery.getCall(0).proxy) !== chainedPayload[0].query) {
    sinon.assert.fail(`Error in principal query : ${String(chainedQuery.getCall(0).proxy)} expected`);
  }
  if (chainedPayload[0].args) {
    sinon.assert.calledOnceWithExactly(chainedQuery, ...chainedPayload[0].args);
  } else sinon.assert.calledOnceWithExactly(chainedQuery);

  for (let i = 1; i < chainedPayload.length; i++) {
    const { query, args } = chainedPayload[i];
    chainedQuery = chainedQuery.getCall(0).returnValue[query];
    if (!chainedQuery) sinon.assert.fail('Error in secondary queries');
    if (args && args.length) sinon.assert.calledWithExactly(chainedQuery, ...args);
    else sinon.assert.calledWithExactly(chainedQuery);
  }
};

module.exports = {
  stubChainedQueries,
  calledWithExactly,
  calledOnceWithExactly,
};
