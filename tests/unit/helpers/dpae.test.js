const expect = require('expect');
const sinon = require('sinon');
const User = require('../../../src/models/User');
const DpaeHelper = require('../../../src/helpers/dpae');
const FileHelper = require('../../../src/helpers/file');
require('sinon-mongoose');

describe('formatBirthDate', () => {
  it('should format date', () => {
    expect(DpaeHelper.formatBirthDate('2020-09-10T09:12:00')).toEqual('10/09/2020');
  });
  it('should return empty string if date is null', () => {
    expect(DpaeHelper.formatBirthDate(null)).toEqual('');
  });
});

describe('shortenAddress', () => {
  it('should return address as already short', () => {
    expect(DpaeHelper.shortenAddress('12 rue de la paix')).toEqual('12 rue de la paix');
  });

  it('should shorten address if too long', () => {
    expect(DpaeHelper.shortenAddress('12 avenue du maréchal de lattre de tassigny'))
      .toEqual('12 avenue du maréchal de');
  });
});

describe('formatAddress', () => {
  let shortenAddress;
  beforeEach(() => {
    shortenAddress = sinon.stub(DpaeHelper, 'shortenAddress');
  });
  afterEach(() => {
    shortenAddress.restore();
  });

  it('should format address', () => {
    const address = '12 avenue du maréchal de lattre de tassigny';
    shortenAddress.onCall(0).returns('12 avenue du maréchal de');
    shortenAddress.onCall(1).returns('lattre de tassigny');

    const result = DpaeHelper.formatAddress(address);

    expect(result).toEqual({ start: '12 avenue du maréchal de', end: 'lattre de tassigny' });
    sinon.assert.calledWithExactly(shortenAddress.getCall(0), address);
    sinon.assert.calledWithExactly(shortenAddress.getCall(1), 'lattre de tassigny');
  });
});

describe('exportDpae', () => {
  let UserMock;
  let formatAddress;
  let exportToTxt;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    formatAddress = sinon.stub(DpaeHelper, 'formatAddress');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
  });
  afterEach(() => {
    UserMock.restore();
    formatAddress.restore();
    exportToTxt.restore();
  });

  it('should export dpae', async () => {
    const contract = { startDate: '2020-10-03T00:00:00', user: 'mon auxiliaire' };
    const auxiliary = {
      identity: {
        title: 'mr',
        lastname: 'Sandbox',
        firstname: 'Olivier',
        birthDate: '1991-10-01T00:00:00',
        birthState: 'DJ',
        birthCountry: 'Djibouti',
        birthCity: 'Djibouti',
        socialSecurityNumber: '21991102309878624',
        nationality: 'AZ',
      },
      establishment: { siret: '1234567890' },
      serialNumber: 'serialNumber',
      contact: { address: { zipCode: '75', city: 'Paris', street: 'tamalou' } },
      administrative: { payment: { rib: { bic: 'AUDIFRPP', iban: 'raboul le fric' } } },
    };

    UserMock.expects('findOne')
      .withExactArgs({ _id: 'mon auxiliaire' }, 'identity serialNumber contact administrative.payment establishment')
      .chain('populate')
      .withExactArgs({ path: 'establishment', select: 'siret' })
      .chain('lean')
      .returns(auxiliary);
    formatAddress.returns({ start: 'start', end: 'end' });
    exportToTxt.returns('file');

    const result = await DpaeHelper.exportDpae(contract);

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [[
        'ap_soc',
        'ap_etab',
        'ap_matr',
        'fs_titre',
        'fs_nom',
        'fs_prenom',
        'fs_secu',
        'fs_date_nai',
        'fs_dept_nai',
        'fs_pays_nai',
        'fs_lieu_nai',
        'fs_nat',
        'fs_adr1',
        'fs_adr2',
        'fs_cp',
        'fs_ville',
        'fs_pays',
        'fs_bq_dom',
        'fs_bq_iban',
        'fs_bq_bic',
        'fs_bq_mode',
        'fs_regime',
        'fs_natc',
        'fs_categ',
        'fs_typec',
        'fs_emploi',
        'fs_emploi_insee',
        'fs_anc',
        'fs_mv_entree',
      ], [
        process.env.AP_SOC,
        '67890',
        'serialNumber',
        1,
        'Sandbox',
        'Olivier',
        '21991102309878624',
        '01/10/1991',
        'DJ',
        'Djibouti',
        'Djibouti',
        'AZ',
        'start',
        'end',
        '75',
        'Paris',
        'FR',
        'BANK AUDI FRANCE',
        'raboul le fric',
        'AUDIFRPP',
        'V',
        '50',
        '00201:0:0:0:0:0',
        '015',
        '005',
        'Auxiliaire d\'envie',
        '563b',
        '03/10/2020',
        '03/10/2020',
      ]]
    );
  });
});
