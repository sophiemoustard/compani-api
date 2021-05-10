const expect = require('expect');
const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const _ = require('lodash');

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
  let findOne;
  let save;
  let getDistanceMatrix;

  beforeEach(() => {
    findOne = sinon.stub(DistanceMatrix, 'findOne');
    save = sinon.stub(DistanceMatrix.prototype, 'save').returnsThis();
    getDistanceMatrix = sinon.stub(maps, 'getDistanceMatrix').returns(distanceMatrixResult);
  });

  afterEach(() => {
    findOne.restore();
    save.restore();
    getDistanceMatrix.restore();
  });

  it('should return the document already saved', async () => {
    findOne.returns({ duration: 13792 });

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest, companyId);

    sinon.assert.calledOnce(findOne);
    sinon.assert.notCalled(getDistanceMatrix);
    expect(result).toMatchObject({ duration: 13792 });
  });

  it('should return null if distance is missing', async () => {
    findOne.returns(null);

    const mapResult = _.cloneDeep(distanceMatrixResult);
    delete mapResult.data.rows[0].elements[0].distance;
    getDistanceMatrix.returns(mapResult);

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest, companyId);

    sinon.assert.calledOnce(getDistanceMatrix);
    sinon.assert.notCalled(save);
    expect(result).toBe(null);
  });

  it('should return null if duration is missing', async () => {
    findOne.returns(null);

    const mapResult = _.cloneDeep(distanceMatrixResult);
    delete mapResult.data.rows[0].elements[0].duration;
    getDistanceMatrix.returns(mapResult);

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest, companyId);

    sinon.assert.calledOnce(getDistanceMatrix);
    sinon.assert.notCalled(save);
    expect(result).toBe(null);
  });

  it('should return null if the request failed', async () => {
    findOne.returns(null);

    const mapResult = _.cloneDeep(distanceMatrixResult);
    mapResult.status = 400;
    getDistanceMatrix.returns(mapResult);

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest, companyId);

    sinon.assert.calledOnce(getDistanceMatrix);
    sinon.assert.notCalled(save);
    expect(result).toBe(null);
  });

  it('should return a new DistanceMatrix', async () => {
    findOne.returns(null);
    getDistanceMatrix.returns(distanceMatrixResult);

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest, companyId);

    sinon.assert.calledOnce(save);
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
