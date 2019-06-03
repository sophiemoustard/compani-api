const expect = require('expect');
const sinon = require('sinon');

const FinalPay = require('../../../models/FinalPay');
const FinalPayHelper = require('../../../helpers/finalPay');
const UtilsHelper = require('../../../helpers/utils');

require('sinon-mongoose');

describe('exportFinalPayHistory', () => {
  const header = [
    'Auxiliaire',
    'Equipe',
    'Début de STC',
    'Date de notification',
    'Motif',
    'Fin de contrat',
    'Heures contrat',
    'Total heures travaillées',
    'Dont exo SAP non majorées',
    'Dont majorées et exo SAP',
    'Dont non majorées et non exo SAP',
    'Dont majorées et non exo SAP',
    'Solde heures période',
    'Compteur d\'heures',
    'Heures sup à payer',
    'Heures complémentaires à payer',
    'Mutuelle',
    'Transport',
    'Autres frais',
    'Prime',
    'Indemnité'
  ];

  const finalPays = [
    {
      auxiliary: {
        identity: {
          firstname: 'Tata',
          lastname: 'Toto'
        },
        sector: { name: 'Test' },
      },
      startDate: '2019-05-01T00:00:00.000Z',
      endNotificationDate: '2019-05-31T20:00:00.000Z',
      endReason: 'resignation',
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
      compensation: 156,
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
      endNotificationDate: '2019-05-31T20:00:00.000Z',
      endReason: 'mutation',
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
  let mockFinalPay;

  beforeEach(() => {
    mockFinalPay = sinon.mock(FinalPay);
    expectsFind = mockFinalPay.expects('find')
      .chain('sort')
      .chain('populate')
      .once();
  });

  afterEach(() => {
    mockFinalPay.restore();
  });

  it('should return an array containing just the header', async () => {
    expectsFind.resolves([]);
    const exportArray = await FinalPayHelper.exportFinalPayHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    expectsFind.resolves(finalPays);
    const getFullTitleFromIdentityStub = sinon.stub(UtilsHelper, 'getFullTitleFromIdentity');
    getFullTitleFromIdentityStub.onFirstCall().returns('Tata TOTO');
    getFullTitleFromIdentityStub.onSecondCall().returns('Titi TUTU');
    const exportArray = await FinalPayHelper.exportFinalPayHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['Tata TOTO', 'Test', '01/05/2019', '31/05/2019', 'Démission', '31/05/2019', '77,94', '0,00', '0,00', '0,00', '0,00', '', '-77,94', '-77,94', '0,00', '0,00', 'Oui', '37,60', '18,00', '0,00', '156,00'],
      ['Titi TUTU', 'Autre test', '01/05/2019', '31/05/2019', 'Mutation', '31/05/2019', '97,94', '0,00', '0,00', '0,00', '0,00', '', '-97,94', '-97,94', '0,00', '0,00', 'Oui', '47,60', '20,00', '100,00', ''],
    ]);
    sinon.assert.callCount(getFullTitleFromIdentityStub, 2);
    getFullTitleFromIdentityStub.restore();
  });
});
