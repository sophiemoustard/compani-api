const expect = require('expect');
const sinon = require('sinon');

const ServiceHelper = require('../../../helpers/services');
const Service = require('../../../models/Service');
const { COMPANY_CONTRACT, CUSTOMER_CONTRACT, HOURLY, FIXED } = require('../../../helpers/constants');
const UtilsHelper = require('../../../helpers/utils.js');

require('sinon-mongoose');

describe('exportServices', () => {
  let ServcieModel;
  let getLastVersion;
  beforeEach(() => {
    ServcieModel = sinon.mock(Service);
    ServcieModel = sinon.mock(Service);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').returns(this[0]);
  });
  afterEach(() => {
    ServcieModel.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const services = [];
    ServcieModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .chain('populate')
      .once()
      .returns(services);

    const result = await ServiceHelper.exportServices();

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Nature', 'Type', 'Entrepise', 'Nom', 'Montant unitaire par défaut', 'TVA (%)', 'Plan de majoration', 'Date de début', 'Date de creation', 'Date de mise a jour']);
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
    ServcieModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .chain('populate')
      .once()
      .returns(services);
    const result = await ServiceHelper.exportServices();

    expect(result).toBeDefined();
    expect(result.length).toEqual(services.length + 1);
    expect(result[1]).toMatchObject(['Horaire', 'Prestataire', 'Alenvi', 'lifté', '12,00', '10,00', '', '08/02/2019', '21/01/2019', '14/02/2019']);
    expect(result[2]).toMatchObject(['Forfaitaire', 'Mandataire', 'Compani', 'kické', '13,00', '5,50', 'smatch', '01/02/2019', '21/01/2019', '14/02/2019']);
  });
});
