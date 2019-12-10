const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');

const DistanceMatrixHelper = require('../../../src/helpers/distanceMatrix');
const mapHelper = require('../../../src/helpers/map');


describe('getOrCreateDistanceMatrix', () => {
  let getOrCreateDistanceMatrixStub;
  beforeEach(() => {
    getOrCreateDistanceMatrixStub = sinon.stub(DistanceMatrixHelper, 'getOrCreateDistanceMatrix');
  });
  afterEach(() => {
    getOrCreateDistanceMatrixStub.restore();
  });

  it('should return a distance matrix', async () => {
    const query = {
      origins: '27 rue de Ponthieu 75008 Paris',
      destinations: '37 rue des renaudes, 75017 Paris',
      mode: 'DRVING',
    };
    const credentials = { company: { _id: new ObjectID() } };
    const distanceMatrix = {
      origins: '27 rue de Ponthieu 75008 Paris',
      destinations: '37 rue des renaudes, 75017 Paris',
      mode: 'DRVING',
      distance: 1000,
      duration: 1234,
    };

    getOrCreateDistanceMatrixStub.returns(distanceMatrix);

    const result = await mapHelper.getNewDistanceMatrix(query, credentials);
    expect(result).toBeDefined();
    expect(result).toEqual(distanceMatrix);
    sinon.assert.calledWithExactly(getOrCreateDistanceMatrixStub, query, credentials);
  });
});
