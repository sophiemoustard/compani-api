const expect = require('expect');
const sinon = require('sinon');
const EventsExportHelper = require('../../../helpers/eventsExport');
const UtilsHelper = require('../../../helpers/utils');
const EventRepository = require('../../../repositories/EventRepository');

describe('exportWorkingEventsHistory', () => {
  const header = ['Type', 'Heure interne', 'Service', 'Début', 'Fin', 'Durée', 'Répétition', 'Secteur', 'Auxiliaire - Titre', 'Auxiliaire - Prénom', 'Auxiliaire - Nom', 'A affecter', 'Bénéficiaire - Titre', 'Bénéficiaire - Nom', 'Bénéficiaire - Prénom', 'Divers', 'Facturé', 'Annulé', 'Statut de l\'annulation', 'Raison de l\'annulation'];
  const events = [
    {
      isCancelled: false,
      isBilled: true,
      type: 'intervention',
      repetition: { frequency: 'every_week' },
      sector: { name: 'Girafes - 75' },
      subscription: {
        service: { versions: [{ name: 'Lala' }] },
      },
      customer: {
        identity: {
          title: 'Mme',
          firstname: 'Mimi',
          lastname: 'Mathy',
        },
      },
      auxiliary: {
        identity: {
          firstname: 'Jean-Claude',
          lastname: 'Van Damme',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
    }, {
      isCancelled: true,
      cancel: {
        condition: 'invoiced_and_not_payed',
        reason: 'auxiliary_initiative',
      },
      isBilled: false,
      type: 'internalHour',
      internalHour: { name: 'Formation' },
      repetition: { frequency: 'never' },
      sector: { name: 'Etoiles - 75' },
      customer: {
        identity: {
          title: 'M',
          firstname: 'Bojack',
          lastname: 'Horseman',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
      misc: 'brbr',
    },
  ];
  let getWorkingEventsForExport;
  let getLastVersion;
  beforeEach(() => {
    getWorkingEventsForExport = sinon.stub(EventRepository, 'getWorkingEventsForExport');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
  });
  afterEach(() => {
    getWorkingEventsForExport.restore();
    getLastVersion.restore();
  });

  it('should return an array containing just the header', async () => {
    getWorkingEventsForExport.returns([]);
    const exportArray = await EventsExportHelper.exportWorkingEventsHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    getWorkingEventsForExport.returns(events);
    getLastVersion.callsFake(ver => ver[0]);

    const exportArray = await EventsExportHelper.exportWorkingEventsHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['Intervention', '', 'Lala', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', 'Une fois par semaine', 'Girafes - 75', '', 'Jean-Claude', 'VAN DAMME', 'Non', 'Mme', 'MATHY', 'Mimi', '', 'Oui', 'Non', '', ''],
      ['Heure interne', 'Formation', '', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', '', 'Etoiles - 75', '', '', '', 'Oui', 'M', 'HORSEMAN', 'Bojack', 'brbr', 'Non', 'Oui', 'Facturée & non payée', 'Initiative du de l\'intervenant'],
    ]);
  });
});

describe('exportAbsencesHistory', () => {
  const header = ['Type', 'Nature', 'Début', 'Fin', 'Secteur', 'Auxiliaire - Titre', 'Auxiliaire - Prénom', 'Auxiliaire - Nom', 'Divers'];
  const events = [
    {
      type: 'absence',
      absence: 'unjustified absence',
      absenceNature: 'hourly',
      sector: { name: 'Girafes - 75' },
      auxiliary: {
        identity: {
          firstname: 'Jean-Claude',
          lastname: 'Van Damme',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
    }, {
      type: 'absence',
      absence: 'leave',
      absenceNature: 'daily',
      internalHour: { name: 'Formation' },
      sector: { name: 'Etoiles - 75' },
      auxiliary: {
        identity: {
          firstname: 'Princess',
          lastname: 'Carolyn',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
      misc: 'brbr',
    },
  ];
  let getAbsencesForExport;
  beforeEach(() => {
    getAbsencesForExport = sinon.stub(EventRepository, 'getAbsencesForExport');
  });
  afterEach(() => {
    getAbsencesForExport.restore();
  });

  it('should return an array containing just the header', async () => {
    getAbsencesForExport.returns([]);
    const exportArray = await EventsExportHelper.exportAbsencesHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    getAbsencesForExport.returns(events);

    const exportArray = await EventsExportHelper.exportAbsencesHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['Absence injustifiée', 'Horaire', '20/05/2019 08:00', '20/05/2019 10:00', 'Girafes - 75', '', 'Jean-Claude', 'VAN DAMME', ''],
      ['Congé', 'Journalière', '20/05/2019', '20/05/2019', 'Etoiles - 75', '', 'Princess', 'CAROLYN', 'brbr'],
    ]);
  });
});
