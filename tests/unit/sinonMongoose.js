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

const checkFirstQueryCoherence = (stubbedMethod, chainedPayload, callCount) => {
  const expectedQuery = chainedPayload[0].query;
  const receivedQuery = String(stubbedMethod.getCall(callCount).proxy);
  if (expectedQuery !== receivedQuery) {
    sinon.assert.fail(`Error in principal query : expected: "${expectedQuery}", received: "${receivedQuery}"`);
  }
};

const checkSecondaryQueriesCall = (stubbedMethod, chainedPayload, callCount) => {
  const expectedQueries = chainedPayload.map(payload => payload.query);
  const receivedQueries = Object.entries(stubbedMethod.getCall(callCount).returnValue)
    .map(query => ({ name: query[0], functionStub: query[1] }));
  for (const receivedQuery of receivedQueries) {
    if (!expectedQueries.includes(receivedQuery.name)) {
      sinon.assert.fail(`Error in secondary queries: unexpected "${receivedQuery.name}" received`);
    }
    sinon.assert.callCount(
      receivedQuery.functionStub,
      expectedQueries.filter(expectedQuery => receivedQuery.name === expectedQuery).length
    );
  }
  for (let i = 1; i < chainedPayload.length; i++) {
    const { query, args } = chainedPayload[i];
    const chainedQuery = stubbedMethod.getCall(callCount).returnValue[query];
    if (!chainedQuery) sinon.assert.fail(`Error in secondary queries : "${query}" does not exist`);

    if (args && args.length) sinon.assert.calledWithExactly(chainedQuery, ...args);
    else sinon.assert.calledWithExactly(chainedQuery);
  }
};

const calledWithExactly = (stubbedMethod, chainedPayload, callCount = 0) => {
  checkFirstQueryCoherence(stubbedMethod, chainedPayload, callCount);

  if (chainedPayload[0].args) {
    sinon.assert.calledWithExactly(stubbedMethod.getCall(callCount), ...chainedPayload[0].args);
  } else {
    sinon.assert.calledWithExactly(stubbedMethod.getCall(callCount));
  }

  checkSecondaryQueriesCall(stubbedMethod, chainedPayload, callCount);
};

const calledOnceWithExactly = (stubbedMethod, chainedPayload) => {
  checkFirstQueryCoherence(stubbedMethod, chainedPayload, 0);

  if (chainedPayload[0].args) sinon.assert.calledOnceWithExactly(stubbedMethod, ...chainedPayload[0].args);
  else sinon.assert.calledOnceWithExactly(stubbedMethod);

  checkSecondaryQueriesCall(stubbedMethod, chainedPayload, 0);
};

module.exports = {
  stubChainedQueries,
  calledWithExactly,
  calledOnceWithExactly,
};
