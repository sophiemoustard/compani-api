const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const UtilsHelper = require('../../../src/helpers/utils');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const Company = require('../../../src/models/Company');
const Customer = require('../../../src/models/Customer');

require('sinon-mongoose');

describe('subscriptionsAccepted', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(Company, 'findOne');
  });

  afterEach(() => {
    findOne.restore();
  });

  it('should set subscriptionsAccepted to true', async () => {
    const customer = {
      subscriptions: [{
        versions: [{
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          _id: new ObjectID('5c41f4d62fc4d8780f0628ea'),
          unitTTCRate: 13,
          estimatedWeeklyVolume: 12,
          sundays: 2,
        }, {
          startDate: '2019-01-27T23:00:00.000Z',
          createdAt: '2019-01-18T15:46:37.471Z',
          _id: new ObjectID('5c41f4dd2fc4d8780f0628eb'),
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          sundays: 2,
          evenings: 3,
        }],
        createdAt: '2019-01-18T15:46:30.637Z',
        _id: new ObjectID('5c41f4d62fc4d8780f0628e9'),
        service: {
          _id: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
          nature: 'Horaire',
          defaultUnitAmount: 25,
          vat: 5.5,
          holidaySurcharge: 10,
          eveningSurcharge: 25,
          name: 'Temps de qualité - Autonomie',
          startDate: '2019-01-18T15:37:30.636Z',
        },
      }],
      subscriptionsHistory: [{
        helper: {
          firstname: 'Test',
          lastname: 'Test',
          title: '',
        },
        subscriptions: [{
          _id: new ObjectID('5c45a98fa2e4e133a6774e47'),
          service: 'Temps de qualité - Autonomie',
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          startDate: '2019-01-27T23:00:00.000Z',
          evenings: 3,
          sundays: 2,
        }],
        approvalDate: '2019-01-21T11:14:23.030Z',
        _id: new ObjectID('5c45a98fa2e4e133a6774e46'),
      }],
    };
    findOne.returns({
      customersConfig: {
        services: [{
          _id: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
          nature: 'Horaire',
          versions: [{
            defaultUnitAmount: 25,
            vat: 5.5,
            holidaySurcharge: 10,
            eveningSurcharge: 25,
            name: 'Temps de qualité - Autonomie',
            startDate: '2019-01-18T15:37:30.636Z',
          }],
        }, {
          _id: new ObjectID('5c41f4e42fc4d8780f0628ec'),
          versions: [{
            name: 'Nuit',
            defaultUnitAmount: 175,
            vat: 12,
            startDate: '2019-01-19T18:46:30.636Z',
          }],
          nature: 'Horaire',
        }],
      },
    });

    const result = await SubscriptionsHelper.subscriptionsAccepted(customer);
    expect(result).toBeDefined();
    expect(result.subscriptionsAccepted).toBeTruthy();
  });

  it('should set subscriptionsAccepted to false', async () => {
    const customer = {
      subscriptions: [{
        versions: [{
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          _id: new ObjectID('5c41f4d62fc4d8780f0628ea'),
          unitTTCRate: 13,
          estimatedWeeklyVolume: 12,
          sundays: 2,
        }, {
          startDate: '2019-01-27T23:00:00.000Z',
          createdAt: '2019-01-18T15:46:37.471Z',
          _id: new ObjectID('5c41f4dd2fc4d8780f0628eb'),
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          sundays: 2,
          evenings: 3,
        }],
        createdAt: '2019-01-18T15:46:30.637Z',
        _id: new ObjectID('5c41f4d62fc4d8780f0628e9'),
        service: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
      }],
      subscriptionsHistory: [{
        helper: {
          firstname: 'Test',
          lastname: 'Test',
          title: '',
        },
        subscriptions: [{
          _id: new ObjectID('5c45a98fa2e4e133a6774e47'),
          service: 'Temps de qualité - Autonomie',
          unitTTCRate: 35,
          estimatedWeeklyVolume: 12,
          startDate: '2019-01-27T23:00:00.000Z',
        }],
        approvalDate: '2019-01-21T11:14:23.030Z',
        _id: new ObjectID('5c45a98fa2e4e133a6774e46'),
      }],
    };
    findOne.returns({
      customersConfig: {
        services: [{
          _id: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
          nature: 'Horaire',
          versions: [{
            defaultUnitAmount: 25,
            vat: 5.5,
            holidaySurcharge: 10,
            eveningSurcharge: 25,
            name: 'Temps de qualité - Autonomie',
            startDate: '2019-01-18T15:37:30.636Z',
          }],
        }],
      },
    });

    const result = await SubscriptionsHelper.subscriptionsAccepted(customer);
    expect(result).toBeDefined();
    expect(result.subscriptionsAccepted).toBeFalsy();
  });
});

describe('exportSubscriptions', () => {
  let CustomerModel;
  let getLastVersion;
  let formatFloatForExport;
  beforeEach(() => {
    CustomerModel = sinon.mock(Customer);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(v => v[0]);
    formatFloatForExport = sinon.stub(UtilsHelper, 'formatFloatForExport');
    formatFloatForExport.callsFake(float => `F-${float || ''}`);
  });

  afterEach(() => {
    CustomerModel.restore();
    getLastVersion.restore();
    formatFloatForExport.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    const companyId = new ObjectID();
    CustomerModel.expects('find')
      .withExactArgs({ subscriptions: { $exists: true, $not: { $size: 0 } }, company: companyId })
      .chain('populate')
      .once()
      .returns(customers);

    const credentials = { company: { _id: companyId } };
    const result = await SubscriptionsHelper.exportSubscriptions(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Titre', 'Nom', 'Prénom', 'Service', 'Prix unitaire TTC', 'Volume hebdomadaire estimatif', 'Dont soirées', 'Dont dimanches']);
  });

  it('should return subscriptions info', async () => {
    const customers = [
      {
        identity: { lastname: 'Autonomie', title: 'mr' },
        subscriptions: [{
          service: { versions: [{ name: 'Service' }] },
          versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 4, sundays: 2, evenings: 9 }],
        }],
      },
    ];
    const companyId = new ObjectID();
    CustomerModel.expects('find')
      .withExactArgs({ subscriptions: { $exists: true, $not: { $size: 0 } }, company: companyId })
      .chain('populate')
      .once()
      .returns(customers);

    const credentials = { company: { _id: companyId } };
    const result = await SubscriptionsHelper.exportSubscriptions(credentials);

    sinon.assert.calledTwice(getLastVersion);
    sinon.assert.calledTwice(formatFloatForExport);
    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['M.', 'AUTONOMIE', '', 'Service', 'F-12', 'F-4', 9, 2]);
  });
});
