const { expect } = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const Contract = require('../../../../src/models/Contract');
const Contracts123PayHelper = require('../../../../src/helpers/123paie/contracts');
const FileHelper = require('../../../../src/helpers/file');
const ContractHelper = require('../../../../src/helpers/contracts');
const { SERIOUS_MISCONDUCT_LAYOFF, CONTRACTUAL_TERMINATION } = require('../../../../src/helpers/constants');
const SinonMongoose = require('../../sinonMongoose');

describe('exportsContractVersions', () => {
  let findContract;
  let exportToTxt;
  let getQuery;
  beforeEach(() => {
    findContract = sinon.stub(Contract, 'find');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
    getQuery = sinon.stub(ContractHelper, 'getQuery');
    process.env.AP_SOC = 'ap_soc';
  });
  afterEach(() => {
    findContract.restore();
    exportToTxt.restore();
    getQuery.restore();
    process.env.AP_SOC = '';
  });

  it('should export contract version', async () => {
    const query = { startDate: '2020-10-31T22:00:00', endDate: '2020-11-30T22:00:00' };
    const companyId = '1234567890';
    const versions = [{
      user: { serialNumber: 'serialNumber', identity: { lastname: 'Rougé' } },
      serialNumber: 'contractNumber',
      versions: [
        { weeklyHours: 18, grossHourlyRate: 10, startDate: '2020-09-01T22:00:00', endDate: '2020-10-01T21:59:59' },
        { weeklyHours: 24, grossHourlyRate: 10, startDate: '2020-10-01T22:00:00', endDate: '2020-11-09T21:59:59' },
        { weeklyHours: 18, grossHourlyRate: 10, startDate: '2020-11-10T22:00:00' },
      ],
    }, {
      user: { serialNumber: 'userNumber', identity: { lastname: 'Gallier' } },
      serialNumber: 'titotu',
      versions: [
        { weeklyHours: 12, grossHourlyRate: 10, startDate: '2020-07-01T22:00:00', endDate: '2020-11-02T21:59:59' },
        { weeklyHours: 6, grossHourlyRate: 10, startDate: '2020-11-02T22:00:00' },
      ],
    }];

    getQuery.returns([{ endDate: null }, { endDate: { $exists: false } }]);
    findContract.returns(SinonMongoose.stubChainedQueries(versions));
    exportToTxt.returns('file');

    const result = await Contracts123PayHelper.exportContractVersions(query, { company: { _id: companyId } });

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(getQuery, query, companyId);
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [
        ['ap_soc', 'ap_matr', 'fs_nom', 'ap_contrat', 'fs_date_avenant', 'fs_horaire', 'fs_sal_forfait_montant'],
        ['ap_soc', 'serialNumber', 'Rougé', 'contractNumber', '10/11/2020', 78, 780],
        ['ap_soc', 'userNumber', 'Gallier', 'titotu', '02/11/2020', 26, 260],
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findContract,
      [
        { query: 'find', args: [{ $and: [{ endDate: null }, { endDate: { $exists: false } }] }] },
        { query: 'populate', args: [{ path: 'user', select: 'serialNumber identity' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('exportContractEnds', () => {
  let findContract;
  let exportToTxt;
  beforeEach(() => {
    findContract = sinon.stub(Contract, 'find');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
    process.env.AP_SOC = 'ap_soc';
  });
  afterEach(() => {
    findContract.restore();
    exportToTxt.restore();
    process.env.AP_SOC = '';
  });

  it('should export contract end', async () => {
    const query = { startDate: '2020-10-31T22:00:00', endDate: '2020-11-30T22:00:00' };
    const companyId = '1234567890';
    const contracts = [{
      user: { serialNumber: 'serialNumber', identity: { lastname: 'Rougé' } },
      serialNumber: 'contractNumber',
      endDate: '2020-11-04T00:00:00',
      endReason: CONTRACTUAL_TERMINATION,
    }, {
      user: { serialNumber: 'userNumber', identity: { lastname: 'Gallier' } },
      serialNumber: 'titotu',
      endDate: '2020-11-07T00:00:00',
      endReason: SERIOUS_MISCONDUCT_LAYOFF,
    }];

    findContract.returns(SinonMongoose.stubChainedQueries(contracts));
    exportToTxt.returns('file');

    const result = await Contracts123PayHelper.exportContractEnds(query, { company: { _id: companyId } });

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [
        ['ap_soc', 'ap_matr', 'fs_nom', 'ap_contrat', 'fs_mv_sortie', 'fs_mv_motif_s'],
        ['ap_soc', 'serialNumber', 'Rougé', 'contractNumber', '04/11/2020', 8],
        ['ap_soc', 'userNumber', 'Gallier', 'titotu', '07/11/2020', 16],
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findContract,
      [
        {
          query: 'find',
          args: [{
            endDate: {
              $lte: moment(query.endDate).endOf('d').toDate(),
              $gte: moment(query.startDate).startOf('d').toDate(),
            },
            company: '1234567890',
          }],
        },
        { query: 'populate', args: [{ path: 'user', select: 'serialNumber identity' }] },
        { query: 'lean' },
      ]
    );
  });
});
