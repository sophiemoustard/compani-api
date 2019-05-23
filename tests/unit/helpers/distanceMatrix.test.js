const expect = require('expect');
const sinon = require('sinon');
const _ = require('lodash');

const DistanceMatrixHelper = require('../../../helpers/distanceMatrix');

const DistanceMatrix = require('../../../models/DistanceMatrix');
const maps = require('../../../models/Google/Maps');


const distanceMatrixRequest = {
  origins: 'Washington, DC',
  destinations: 'New York City, NY',
  mode: 'DRIVING'
};

const distanceMatrixResult = {
  data: {
    destination_addresses: ['New York, État de New York, États-Unis'],
    origin_addresses: ['Washington, District de Columbia, États-Unis'],
    rows: [
      {
        elements: [
          {
            distance: {
              text: '226 miles',
              value: 363998
            },
            duration: {
              text: '3 heures 50 minutes',
              value: 13790
            },
            status: 'OK'
          }
        ]
      }
    ],
    status: 'OK'
  },
  status: 200
};

describe('getOrCreateDistanceMatrix', () => {
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
    findOne.returns({
      duration: 13792
    });

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest);

    expect(result).toMatchObject({ duration: 13792 });
  });

  it('should return null if distance is missing', async () => {
    findOne.returns(null);

    const mapResult = _.cloneDeep(distanceMatrixResult);
    delete mapResult.data.rows[0].elements[0].distance;
    getDistanceMatrix.returns(mapResult);

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest);

    expect(result).toBe(null);
  });

  it('should return null if duration is missing', async () => {
    findOne.returns(null);

    const mapResult = _.cloneDeep(distanceMatrixResult);
    delete mapResult.data.rows[0].elements[0].duration;
    getDistanceMatrix.returns(mapResult);

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest);

    expect(result).toBe(null);
  });

  it('should return null if the request failed', async () => {
    findOne.returns(null);

    const mapResult = _.cloneDeep(distanceMatrixResult);
    mapResult.status = 400;
    getDistanceMatrix.returns(mapResult);

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest);

    expect(result).toBe(null);
  });

  it('should return a new DistanceMatrix', async () => {
    findOne.returns(null);
    getDistanceMatrix.returns(distanceMatrixResult);

    const result = await DistanceMatrixHelper.getOrCreateDistanceMatrix(distanceMatrixRequest);

    expect(result).toEqual(expect.objectContaining({
      _id: expect.any(Object),
      destinations: 'New York City, NY',
      distance: 363998,
      duration: 13790,
      origins: 'Washington, DC',
      mode: 'DRIVING'
    }));
  });
});
