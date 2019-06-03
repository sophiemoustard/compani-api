const expect = require('expect');
const sinon = require('sinon');
const UtilsHelper = require('../../../helpers/utils');
const FundingsHelper = require('../../../helpers/fundings');
const Customer = require('../../../models/Customer');

require('sinon-mongoose');

describe('exportFundings', () => {
  let CustomerModel;
  let getLastVersion;
  beforeEach(() => {
    CustomerModel = sinon.mock(Customer);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').returns(this[0]);
  });

  afterEach(() => {
    CustomerModel.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    CustomerModel.expects('aggregate').returns(customers);

    const result = await FundingsHelper.exportFundings();

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Bénéficiaire', 'Tiers payeur', 'Nature', 'Service', 'Date de début', 'Date de fin', 'Numéro de dossier',
      'Fréquence', 'Montant TTC', 'Montant unitaire TTC', 'Nombre d\'heures', 'Jours', 'Participation du bénéficiaire']);
  });

  it('should return customer info', async () => {
    const customers = [
      {
        identity: { lastname: 'Autonomie', title: 'M' },
      }
    ];

    CustomerModel.expects('aggregate').returns(customers);

    const result = await FundingsHelper.exportFundings();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['M Autonomie', '', '', '', '', '', '', '', '', '', '', '', '']);
  });

  it('should return funding third party payer', async () => {
    const customers = [
      { funding: { thirdPartyPayer: { name: 'tpp' } } },
    ];

    CustomerModel.expects('aggregate').returns(customers);

    const result = await FundingsHelper.exportFundings();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', 'tpp', '', '', '', '', '', '', '', '', '', '', '']);
  });

  it('should return funding service', async () => {
    const customers = [
      { funding: { subscription: { service: { versions: [{ name: 'Toto' }] } } } },
    ];

    CustomerModel.expects('aggregate').returns(customers);

    const result = await FundingsHelper.exportFundings();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', 'Toto', '', '', '', '', '', '', '', '', '']);
  });

  it('should return funding info', async () => {
    const customers = [
      {
        funding: {
          nature: 'fixed',
          frequency: 'once',
          startDate: '2018-07-15T00:00:00.000+00:00',
          endDate: '2018-07-15T00:00:00.000+00:00',
          folderNumber: 'Toto',
          amountTTC: 12,
          unitTTCRate: 14,
          careHours: 3,
          careDays: [1, 4, 5],
          customerParticipationRate: 90,
        },
      }
    ];

    CustomerModel.expects('aggregate').returns(customers);

    const result = await FundingsHelper.exportFundings();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', 'Forfaitaire', '', '15/07/2018', '15/07/2018', 'Toto', 'Une seule fois', '12,00', '14,00', '3,00',
      'Mardi Vendredi Samedi ', '90,00']);
  });
});
