const expect = require('expect');
const sinon = require('sinon');

const Pay = require('../../../models/Pay');
const PayHelper = require('../../../helpers/pay');
const UtilsHelper = require('../../../helpers/utils');

require('sinon-mongoose');

describe('exportPayHistory', () => {
  const header = [
    'Auxiliaire',
    'Equipe',
    'Début',
    'Fin',
    'Heures contrat',
    'Total heures travaillées',
    'Dont exo SAP non majorées',
    'Dont majorées et exo SAP',
    'Dont non majorées non exo SAP',
    'Dont majorées et non exo SAP',
    'Solde heures période',
    "Compteur d'heures",
    'Heures sup à payer',
    'Heures complémentaires à payer',
    'Mutuelle',
    'Transport',
    'Autres frais',
    'Prime'
  ];
  const pays = [
    {
      auxiliary: {
        identity: {
          firstname: 'Tata',
          lastname: 'Toto'
        },
        sector: { name: 'Test' },
      },
      startDate: '2019-05-01T00:00:00.000Z',
      endDate: '2019-05-31T20:00:00.000Z',
      contractHours: 77.94,
      workedHours: 0,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      hoursBalance: -77.94,
      hoursCounter: -77.94,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: true,
      transport: 37.6,
      otherFees: 18,
      bonus: 0,
    },
    {
      auxiliary: {
        identity: {
          firstname: 'Titi',
          lastname: 'Tutu'
        },
        sector: { name: 'Autre test' },
      },
      startDate: '2019-05-01T00:00:00.000Z',
      endDate: '2019-05-31T20:00:00.000Z',
      contractHours: 97.94,
      workedHours: 0,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      hoursBalance: -97.94,
      hoursCounter: -97.94,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: true,
      transport: 47.6,
      otherFees: 20,
      bonus: 100,
    }
  ];
  let expectsFind;
  let mockPay;

  beforeEach(() => {
    mockPay = sinon.mock(Pay);
    expectsFind = mockPay.expects('find')
      .chain('sort')
      .chain('populate')
      .once();
  });

  afterEach(() => {
    mockPay.restore();
  });

  it('should return an array containing just the header', async () => {
    expectsFind.resolves([]);
    const exportArray = await PayHelper.exportPayHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    expectsFind.resolves(pays);
    const getFullTitleFromIdentityStub = sinon.stub(UtilsHelper, 'getFullTitleFromIdentity');
    getFullTitleFromIdentityStub.onFirstCall().returns('Tata TOTO');
    getFullTitleFromIdentityStub.onSecondCall().returns('Titi TUTU');
    const exportArray = await PayHelper.exportPayHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['Tata TOTO', 'Test', '01/05/2019', '31/05/2019', 77.94, '', '', '', '', '', -77.94, -77.94, '', '', 'Oui', 37.6, 18, ''],
      ['Titi TUTU', 'Autre test', '01/05/2019', '31/05/2019', 97.94, '', '', '', '', '', -97.94, -97.94, '', '', 'Oui', 47.6, 20, 100],
    ]);
    sinon.assert.callCount(getFullTitleFromIdentityStub, 2);
    getFullTitleFromIdentityStub.restore();
  });
});
