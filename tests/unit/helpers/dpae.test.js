const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const User = require('../../../src/models/User');
const Contract = require('../../../src/models/Contract');
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

describe('formatIdentificationInfo', () => {
  let formatAddress;
  beforeEach(() => {
    formatAddress = sinon.stub(DpaeHelper, 'formatAddress');
  });
  afterEach(() => {
    formatAddress.restore();
  });

  it('should format identification info', async () => {
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
    };
    formatAddress.returns({ start: 'start', end: 'end' });

    const result = await DpaeHelper.formatIdentificationInfo(auxiliary);

    expect(result).toEqual({
      ap_soc: process.env.AP_SOC,
      ap_etab: '67890',
      ap_matr: 'serialNumber',
      fs_titre: 1,
      fs_nom: 'Sandbox',
      fs_prenom: 'Olivier',
      fs_secu: '21991102309878624',
      fs_date_nai: '01/10/1991',
      fs_dept_nai: 'DJ',
      fs_pays_nai: 'Djibouti',
      fs_lieu_nai: 'Djibouti',
      fs_nat: 'AZ',
      fs_adr1: 'start',
      fs_adr2: 'end',
      fs_cp: '75',
      fs_ville: 'Paris',
      fs_pays: 'FR',
    });
  });
});

describe('formatBankingInfo', () => {
  it('should format banking info', async () => {
    const auxiliary = {
      administrative: { payment: { rib: { bic: 'AUDIFRPP', iban: 'raboul le fric' } } },
    };

    const result = await DpaeHelper.formatBankingInfo(auxiliary);

    expect(result).toEqual({
      fs_bq_dom: 'BANK AUDI FRANCE',
      fs_bq_iban: 'raboul le fric',
      fs_bq_bic: 'AUDIFRPP',
      fs_bq_mode: 'V',
    });
  });
});

describe('formatContractInfo', () => {
  it('should format contract info', async () => {
    const contract = {
      startDate: '2020-10-03T00:00:00',
      user: 'mon auxiliaire',
      serialNumber: '1234567890',
      versions: [{ weeklyHours: 24 }],
    };

    const result = await DpaeHelper.formatContractInfo(contract);

    expect(result).toEqual({
      ap_contrat: '1234567890',
      fs_regime: '50',
      fs_natc: '00201:0:0:0:0:0',
      fs_categ: '015',
      fs_typec: '005',
      fs_emploi: 'Auxiliaire d\'envie',
      fs_emploi_insee: '563b',
      fs_anc: '03/10/2020',
      fs_mv_entree: '03/10/2020',
      fs_horaire: 104,
    });
  });
});

describe('exportDpae', () => {
  let UserMock;
  let formatIdentificationInfo;
  let formatBankingInfo;
  let formatContractInfo;
  let exportToTxt;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    formatIdentificationInfo = sinon.stub(DpaeHelper, 'formatIdentificationInfo');
    formatBankingInfo = sinon.stub(DpaeHelper, 'formatBankingInfo');
    formatContractInfo = sinon.stub(DpaeHelper, 'formatContractInfo');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
  });
  afterEach(() => {
    UserMock.restore();
    formatIdentificationInfo.restore();
    formatBankingInfo.restore();
    formatContractInfo.restore();
    exportToTxt.restore();
  });

  it('should export dpae', async () => {
    const contract = {
      startDate: '2020-10-03T00:00:00',
      user: 'mon auxiliaire',
      serialNumber: '1234567890',
      versions: [{ weeklyHours: 24 }],
    };
    const auxiliary = { serialNumber: 'serialNumber' };

    UserMock.expects('findOne')
      .withExactArgs({ _id: 'mon auxiliaire' }, 'identity serialNumber contact administrative.payment establishment')
      .chain('populate')
      .withExactArgs({ path: 'establishment', select: 'siret' })
      .chain('lean')
      .returns(auxiliary);
    formatIdentificationInfo.returns({ ap_matr: 'serialNumber' });
    formatBankingInfo.returns({ fs_bq_dom: 'BANK AUDI FRANCE' });
    formatContractInfo.returns({ ap_contrat: '1234567890' });
    exportToTxt.returns('file');

    const result = await DpaeHelper.exportDpae(contract);

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(formatIdentificationInfo, auxiliary);
    sinon.assert.calledOnceWithExactly(formatBankingInfo, auxiliary);
    sinon.assert.calledOnceWithExactly(formatContractInfo, contract);
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [['ap_matr', 'fs_bq_dom', 'ap_contrat'], ['serialNumber', 'BANK AUDI FRANCE', '1234567890']]
    );
  });
});

describe('exportContracts', () => {
  let ContractMock;
  let formatIdentificationInfo;
  let formatBankingInfo;
  let formatContractInfo;
  let exportToTxt;
  beforeEach(() => {
    ContractMock = sinon.mock(Contract);
    formatIdentificationInfo = sinon.stub(DpaeHelper, 'formatIdentificationInfo');
    formatBankingInfo = sinon.stub(DpaeHelper, 'formatBankingInfo');
    formatContractInfo = sinon.stub(DpaeHelper, 'formatContractInfo');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
  });
  afterEach(() => {
    ContractMock.restore();
    formatIdentificationInfo.restore();
    formatBankingInfo.restore();
    formatContractInfo.restore();
    exportToTxt.restore();
  });

  it('should export contracts', async () => {
    const endDate = moment('2020-01-11T14:00:00').toDate();
    const companyId = new ObjectID();

    ContractMock.expects('find')
      .withExactArgs({
        startDate: { $lte: moment(endDate).endOf('d').toDate() },
        $or: [
          { endDate: null },
          { endDate: { $exists: false } },
          { endDate: { $gt: moment(endDate).endOf('d').toDate() } },
        ],
        company: companyId,
      })
      .chain('populate')
      .withExactArgs({ path: 'user', select: 'serialNumber identity contact.address administrative.payment' })
      .chain('lean')
      .once()
      .returns([{ user: 'first user' }, { user: 'second user' }]);
    formatIdentificationInfo.onFirstCall().returns({ identity: 1 }).onSecondCall().returns({ identity: 2 });
    formatBankingInfo.onFirstCall().returns({ bank: 1 }).onSecondCall().returns({ bank: 2 });
    formatContractInfo.onFirstCall().returns({ contract: 1 }).onSecondCall().returns({ contract: 2 });
    exportToTxt.returns('file');

    const result = await DpaeHelper.exportContracts({ endDate }, { company: { _id: companyId } });
    expect(result).toEqual('file');
    sinon.assert.calledTwice(formatIdentificationInfo);
    sinon.assert.calledWithExactly(formatIdentificationInfo.getCall(0), 'first user');
    sinon.assert.calledWithExactly(formatIdentificationInfo.getCall(1), 'second user');
    sinon.assert.calledTwice(formatBankingInfo);
    sinon.assert.calledWithExactly(formatBankingInfo.getCall(0), 'first user');
    sinon.assert.calledWithExactly(formatBankingInfo.getCall(1), 'second user');
    sinon.assert.calledTwice(formatContractInfo);
    sinon.assert.calledWithExactly(formatContractInfo.getCall(0), { user: 'first user' });
    sinon.assert.calledWithExactly(formatContractInfo.getCall(1), { user: 'second user' });
    sinon.assert.calledOnceWithExactly(exportToTxt, [['identity', 'bank', 'contract'], [1, 1, 1], [2, 2, 2]]);
  });
});

describe('exportsContractVersions', () => {
  let ContractMock;
  let exportToTxt;
  beforeEach(() => {
    ContractMock = sinon.mock(Contract);
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
  });
  afterEach(() => {
    ContractMock.restore();
    exportToTxt.restore();
  });

  it('should export contract version', async () => {
    const query = { endDate: '2020-11-01T22:00:00' };
    const companyId = '1234567890';
    const versions = [{
      user: { serialNumber: 'serialNumber', identity: { lastname: 'Rougé' } },
      serialNumber: 'contractNumber',
      versions: [
        { weeklyHours: 18, startDate: '2020-09-01T22:00:00' },
        { weeklyHours: 24, startDate: '2020-11-01T22:00:00' },
        { weeklyHours: 18, startDate: '2020-11-10T22:00:00' },
      ],
    }, {
      user: { serialNumber: 'userNumber', identity: { lastname: 'Gallier' } },
      serialNumber: 'titotu',
      versions: [
        { weeklyHours: 12, startDate: '2020-07-01T22:00:00' },
        { weeklyHours: 6, startDate: '2020-10-01T22:00:00' },
      ],
    }];
    ContractMock.expects('find')
      .withExactArgs({
        startDate: { $lte: moment(query.endDate).endOf('d').toDate() },
        $or: [
          { endDate: null },
          { endDate: { $exists: false } },
          { endDate: { $gt: moment(query.endDate).endOf('d').toDate() } },
        ],
        company: companyId,
        versions: { $gte: { $size: 2 } },
      })
      .chain('populate')
      .withExactArgs({ path: 'user', select: 'serialNumber identity' })
      .chain('lean')
      .once()
      .returns(versions);
    exportToTxt.returns('file');

    const result = await DpaeHelper.exportContractVersions(query, { company: { _id: companyId } });

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [
        ['ap_soc', 'ap_matr', 'fs_nom', 'ap_contrat', 'fs_date_avenant', 'fs_horaire'],
        [process.env.AP_SOC, 'serialNumber', 'Rougé', 'contractNumber', '01/11/2020', 104],
        [process.env.AP_SOC, 'serialNumber', 'Rougé', 'contractNumber', '10/11/2020', 78],
        [process.env.AP_SOC, 'userNumber', 'Gallier', 'titotu', '01/10/2020', 26],
      ]
    );
  });
});
