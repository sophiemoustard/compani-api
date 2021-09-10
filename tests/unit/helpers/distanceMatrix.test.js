const expect = require('expect');
const { ObjectID } = require('mongodb');
const sinon = require('sinon');

const DistanceMatrixHelper = require('../../../src/helpers/distanceMatrix');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const maps = require('../../../src/models/Google/Maps');
const SinonMongoose = require('../sinonMongoose');

describe('getDistanceMatrices', () => {
  const distanceMatrix = {
    data: {
      rows: [{ elements: [{ distance: { value: 363998 }, duration: { value: 13790 } }] }],
    },
    status: 200,
  };
  const companyId = new ObjectID();
  let find;

  beforeEach(() => {
    find = sinon.stub(DistanceMatrix, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return a distance matrix', async () => {
    find.returns(SinonMongoose.stubChainedQueries([distanceMatrix], ['lean']));

    const credentials = { company: { _id: companyId } };
    const result = await DistanceMatrixHelper.getDistanceMatrices(credentials);

    expect(result).toEqual(distanceMatrix);
    SinonMongoose.calledWithExactly(find, [{ query: 'find', args: [{ company: companyId }] }, { query: 'lean' }]);
  });
});

describe('getOrCreateDistanceMatrix', () => {
  const distanceMatrixRequest = {
    origins: 'Washington, DC',
    destinations: 'New York City, NY',
    mode: 'DRIVING',
  };
  const distanceMatrixResult = {
    data: {
      rows: [{
        elements: [{
          distance: { value: 363998 },
          duration: { value: 13790 },
        }],
      }],
    },
    status: 200,
  };
  const companyId = new ObjectID();
  let save;
  let getDistanceMatrix;
  let findOne;

  beforeEach(() => {
    save = sinon.stub(DistanceMatrix.prototype, 'save').returnsThis();
    getDistanceMatrix = sinon.stub(maps, 'getDistanceMatrix').returns(distanceMatrixResult);
    findOne = sinon.stub(DistanceMatrix, 'findOne');
  });

  afterEach(() => {
    save.restore();
    findOne.restore();
  });

  it('should return a new DistanceMatrix', async () => {
    getDistanceMatrix.returns(distanceMatrixResult);
    findOne.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest, companyId);

    sinon.assert.calledOnce(save);
    SinonMongoose.calledWithExactly(findOne, [{ query: 'findOne', args: [distanceMatrixRequest] }, { query: 'lean' }]);
    expect(result).toEqual(expect.objectContaining({
      company: companyId,
      _id: expect.any(Object),
      destinations: 'New York City, NY',
      distance: 363998,
      duration: 13790,
      origins: 'Washington, DC',
      mode: 'DRIVING',
    }));
  });
});
