const { expect } = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const User = require('../../../../src/models/User');
const Contract = require('../../../../src/models/Contract');
const Identification123PayHelper = require('../../../../src/helpers/123paie/identification');
const FileHelper = require('../../../../src/helpers/file');
const SinonMongoose = require('../../sinonMongoose');

describe('formatBirthDate', () => {
  it('should format date', () => {
    expect(Identification123PayHelper.formatBirthDate('2020-09-10T09:12:00')).toEqual('10/09/2020');
  });

  it('should return empty string if date is null', () => {
    expect(Identification123PayHelper.formatBirthDate(null)).toEqual('');
  });
});

describe('shortenAddress', () => {
  it('should return address as already short', () => {
    expect(Identification123PayHelper.shortenAddress('12 rue de la paix')).toEqual('12 rue de la paix');
  });

  it('should shorten address if too long', () => {
    expect(Identification123PayHelper.shortenAddress('12 avenue du maréchal de lattre de tassigny'))
      .toEqual('12 avenue du maréchal de');
  });
});

describe('formatAddress', () => {
  let shortenAddress;
  beforeEach(() => {
    shortenAddress = sinon.stub(Identification123PayHelper, 'shortenAddress');
  });
  afterEach(() => {
    shortenAddress.restore();
  });

  it('should format address', () => {
    const address = '12 avenue du maréchal de lattre de tassigny';
    shortenAddress.onCall(0).returns('12 avenue du maréchal de');
    shortenAddress.onCall(1).returns('lattre de tassigny');

    const result = Identification123PayHelper.formatAddress(address);

    expect(result).toEqual({ start: '12 avenue du maréchal de', end: 'lattre de tassigny' });
    sinon.assert.calledWithExactly(shortenAddress.getCall(0), address);
    sinon.assert.calledWithExactly(shortenAddress.getCall(1), 'lattre de tassigny');
  });
});

describe('formatIdentificationInfo', () => {
  let formatAddress;
  beforeEach(() => {
    formatAddress = sinon.stub(Identification123PayHelper, 'formatAddress');
    process.env.AP_SOC = 'ap_soc';
  });
  afterEach(() => {
    formatAddress.restore();
    process.env.AP_SOC = '';
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

    const result = await Identification123PayHelper.formatIdentificationInfo(auxiliary);

    expect(result).toEqual({
      ap_soc: 'ap_soc',
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
      administrative: { payment: { rib: { bic: 'BATIFRP1', iban: 'raboul le fric' } } },
    };

    const result = await Identification123PayHelper.formatBankingInfo(auxiliary);

    expect(result).toEqual({
      fs_bq_dom: 'BANQUE DU BAT ET DES TRAV',
      fs_bq_iban: 'raboul le fric',
      fs_bq_bic: 'BATIFRP1',
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
      versions: [{ weeklyHours: 24, grossHourlyRate: 10 }],
    };

    const result = await Identification123PayHelper.formatContractInfo(contract);

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
      fs_date_avenant: '03/10/2020',
      fs_horaire: 104,
      fs_sal_forfait_montant: 1040,
    });
  });
});

describe('exportDpae', () => {
  let findOneUser;
  let formatIdentificationInfo;
  let formatBankingInfo;
  let formatContractInfo;
  let exportToTxt;
  beforeEach(() => {
    findOneUser = sinon.stub(User, 'findOne');
    formatIdentificationInfo = sinon.stub(Identification123PayHelper, 'formatIdentificationInfo');
    formatBankingInfo = sinon.stub(Identification123PayHelper, 'formatBankingInfo');
    formatContractInfo = sinon.stub(Identification123PayHelper, 'formatContractInfo');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
  });
  afterEach(() => {
    findOneUser.restore();
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

    findOneUser.returns(SinonMongoose.stubChainedQueries(auxiliary));
    formatIdentificationInfo.returns({ ap_matr: 'serialNumber' });
    formatBankingInfo.returns({ fs_bq_dom: 'BANK AUDI FRANCE' });
    formatContractInfo.returns({ ap_contrat: '1234567890' });
    exportToTxt.returns('file');

    const result = await Identification123PayHelper.exportDpae(contract);

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(formatIdentificationInfo, auxiliary);
    sinon.assert.calledOnceWithExactly(formatBankingInfo, auxiliary);
    sinon.assert.calledOnceWithExactly(formatContractInfo, contract);
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [['ap_matr', 'fs_bq_dom', 'ap_contrat'], ['serialNumber', 'BANK AUDI FRANCE', '1234567890']]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneUser,
      [
        {
          query: 'findOne',
          args: [{ _id: 'mon auxiliaire' }, 'identity serialNumber contact administrative.payment establishment'],
        },
        { query: 'populate', args: [{ path: 'establishment', select: 'siret' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('exportIdentification', () => {
  let findContract;
  let formatIdentificationInfo;
  let formatBankingInfo;
  let exportToTxt;
  beforeEach(() => {
    findContract = sinon.stub(Contract, 'find');
    formatIdentificationInfo = sinon.stub(Identification123PayHelper, 'formatIdentificationInfo');
    formatBankingInfo = sinon.stub(Identification123PayHelper, 'formatBankingInfo');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
  });
  afterEach(() => {
    findContract.restore();
    formatIdentificationInfo.restore();
    formatBankingInfo.restore();
    exportToTxt.restore();
  });

  it('should export contracts', async () => {
    const endDate = moment('2020-01-11T14:00:00').toDate();
    const companyId = new ObjectId();

    findContract.returns(SinonMongoose.stubChainedQueries([{ user: 'first user' }, { user: 'second user' }]));
    formatIdentificationInfo.onFirstCall().returns({ identity: 1 }).onSecondCall().returns({ identity: 2 });
    formatBankingInfo.onFirstCall().returns({ bank: 1 }).onSecondCall().returns({ bank: 2 });
    exportToTxt.returns('file');

    const result = await Identification123PayHelper.exportIdentification({ endDate }, { company: { _id: companyId } });

    expect(result).toEqual('file');
    sinon.assert.calledTwice(formatIdentificationInfo);
    sinon.assert.calledWithExactly(formatIdentificationInfo.getCall(0), 'first user');
    sinon.assert.calledWithExactly(formatIdentificationInfo.getCall(1), 'second user');
    sinon.assert.calledTwice(formatBankingInfo);
    sinon.assert.calledWithExactly(formatBankingInfo.getCall(0), 'first user');
    sinon.assert.calledWithExactly(formatBankingInfo.getCall(1), 'second user');
    sinon.assert.calledOnceWithExactly(exportToTxt, [['identity', 'bank'], [1, 1], [2, 2]]);
    SinonMongoose.calledOnceWithExactly(
      findContract,
      [
        {
          query: 'find',
          args: [{
            startDate: { $lte: moment(endDate).endOf('d').toDate() },
            $or: [
              { endDate: null },
              { endDate: { $exists: false } },
              { endDate: { $gt: moment(endDate).endOf('d').toDate() } },
            ],
            company: companyId,
          }],
        },
        {
          query: 'populate',
          args: [{ path: 'user', select: 'serialNumber identity contact.address administrative.payment' }],
        },
        { query: 'lean' },
      ]
    );
  });
});
