const expect = require('expect');
const sinon = require('sinon');

const { ObjectID } = require('mongodb');
const ServiceHelper = require('../../../src/helpers/services');
const Service = require('../../../src/models/Service');
const { COMPANY_CONTRACT, CUSTOMER_CONTRACT, HOURLY, FIXED } = require('../../../src/helpers/constants');
const UtilsHelper = require('../../../src/helpers/utils.js');

require('sinon-mongoose');

describe('exportServices', () => {
  let ServiceModel;
  let getLastVersion;
  let formatFloatForExport;
  beforeEach(() => {
    ServiceModel = sinon.mock(Service);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(v => v[0]);
    formatFloatForExport = sinon.stub(UtilsHelper, 'formatFloatForExport');
    formatFloatForExport.callsFake(float => (float != null ? `F-${float}` : ''));
  });
  afterEach(() => {
    ServiceModel.restore();
    getLastVersion.restore();
    formatFloatForExport.restore();
  });

  it('should return csv header', async () => {
    const services = [];
    const credentials = { company: { _id: new ObjectID() } };
    ServiceModel.expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .chain('populate')
      .once()
      .returns(services);

    const result = await ServiceHelper.exportServices(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Nature',
      'Type',
      'Entreprise',
      'Nom',
      'Montant unitaire par défaut',
      'TVA (%)',
      'Plan de majoration',
      'Date de début',
      'Date de création',
      'Date de mise a jour',
    ]);
  });

  it('should list services', async () => {
    const services = [
      {
        type: COMPANY_CONTRACT,
        nature: HOURLY,
        company: { name: 'Alenvi' },
        versions: [
          { name: 'lifté', defaultUnitAmount: 12, vat: 10, startDate: '2019-02-08T09:38:18.653Z' },
          { name: 'lifté', defaultUnitAmount: 12, vat: 10, startDate: '2019-02-011T09:38:18.653Z' },
        ],
        updatedAt: '2019-02-14T09:38:18.653Z',
        createdAt: '2019-01-21T09:38:18.653Z',
      },
      {
        type: CUSTOMER_CONTRACT,
        nature: FIXED,
        company: { name: 'Compani' },
        versions: [
          {
            name: 'kické', vat: 5.5, defaultUnitAmount: 13, surcharge: { name: 'smatch' }, startDate: '2019-02-01T09:38:18.653Z',
          },
        ],
        updatedAt: '2019-02-14T09:38:18.653Z',
        createdAt: '2019-01-21T09:38:18.653Z',
      },
    ];
    const credentials = { company: { _id: new ObjectID() } };
    ServiceModel.expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .chain('populate')
      .once()
      .returns(services);

    const result = await ServiceHelper.exportServices(credentials);

    sinon.assert.calledTwice(getLastVersion);
    sinon.assert.callCount(formatFloatForExport, 4);
    expect(result).toBeDefined();
    expect(result.length).toEqual(services.length + 1);
    expect(result[1]).toMatchObject(['Horaire', 'Prestataire', 'Alenvi', 'lifté', 'F-12', 'F-10', '', '08/02/2019', '21/01/2019', '14/02/2019']);
    expect(result[2]).toMatchObject(['Forfaitaire', 'Mandataire', 'Compani', 'kické', 'F-13', 'F-5.5', 'smatch', '01/02/2019', '21/01/2019', '14/02/2019']);
  });
});
