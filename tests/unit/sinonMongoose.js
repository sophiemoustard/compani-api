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

const checkFirstQuery = (chainedPayload, stubbedMethod, callCount) => {
  const expectedQuery = String(stubbedMethod.getCall(callCount).proxy);
  const receivedQuery = chainedPayload[0].query;
  if (expectedQuery !== receivedQuery) {
    sinon.assert.fail(`Error in principal query : expected: "${expectedQuery}", received: "${receivedQuery}"`);
  }
};

const checkSecondaryQueries = (chainedPayload, stubbedMethod, callCount) => {
  for (let i = 1; i < chainedPayload.length; i++) {
    const { query, args } = chainedPayload[i];
    const chainedQuery = stubbedMethod.getCall(callCount).returnValue[query];
    if (!chainedQuery) sinon.assert.fail(`Error in secondary queries : "${query}" is not the expected query`);
    if (args && args.length) sinon.assert.calledWithExactly(chainedQuery, ...args);
    else sinon.assert.calledWithExactly(chainedQuery);
  }
};

const calledWithExactly = (stubbedMethod, chainedPayload, callCount = 0) => {
  checkFirstQuery(chainedPayload, stubbedMethod, callCount);

  if (chainedPayload[0].args) {
    sinon.assert.calledWithExactly(stubbedMethod.getCall(callCount), ...chainedPayload[0].args);
  } else {
    sinon.assert.calledWithExactly(stubbedMethod.getCall(callCount));
  }

  checkSecondaryQueries(chainedPayload, stubbedMethod, callCount);
};

const calledOnceWithExactly = (stubbedMethod, chainedPayload) => {
  checkFirstQuery(chainedPayload, stubbedMethod, 0);

  if (chainedPayload[0].args) sinon.assert.calledOnceWithExactly(stubbedMethod, ...chainedPayload[0].args);
  else sinon.assert.calledOnceWithExactly(stubbedMethod);

  checkSecondaryQueries(chainedPayload, stubbedMethod, 0);
};

module.exports = {
  stubChainedQueries,
  calledWithExactly,
  calledOnceWithExactly,
};
