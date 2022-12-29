/* eslint-disable max-len */
const { expect } = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const Event = require('../../../../src/models/Event');
const Pay = require('../../../../src/models/Pay');
const Absences123PayHelper = require('../../../../src/helpers/123paie/absences');
const FileHelper = require('../../../../src/helpers/file');
const DraftPayHelper = require('../../../../src/helpers/draftPay');
const {
  PAID_LEAVE,
  UNPAID_LEAVE,
  MATERNITY_LEAVE,
  PATERNITY_LEAVE,
  PARENTAL_LEAVE,
  ILLNESS,
  UNJUSTIFIED,
  WORK_ACCIDENT,
  TRANSPORT_ACCIDENT,
} = require('../../../../src/helpers/constants');
const SinonMongoose = require('../../sinonMongoose');

describe('getAbsences', () => {
  let findEvent;
  let findPay;
  beforeEach(() => {
    findEvent = sinon.stub(Event, 'find');
    findPay = sinon.stub(Pay, 'find');
  });
  afterEach(() => {
    findEvent.restore();
    findPay.restore();
  });

  it('should return absence from previous month pay date', async () => {
    const companyId = new ObjectId();
    const absences = [{ _id: new ObjectId() }];
    const query = { startDate: '2020-11-01T00:00:00', endDate: '2020-11-30T22:00:00' };

    findPay.returns(
      SinonMongoose.stubChainedQueries([{ createdAt: '2020-10-29T10:31:00' }], ['sort', 'limit', 'lean'])
    );
    findEvent.returns(SinonMongoose.stubChainedQueries(absences, ['populate', 'sort', 'lean']));

    const result = await Absences123PayHelper.getAbsences(query, { company: { _id: companyId } });

    expect(result).toEqual(absences);
    SinonMongoose.calledOnceWithExactly(
      findPay,
      [
        { query: 'find', args: [{ date: { $gte: moment('2020-10-01T00:00:00').toDate() }, company: companyId }] },
        { query: 'sort', args: [{ createdAt: -1 }] },
        { query: 'limit', args: [1] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findEvent,
      [
        {
          query: 'find',
          args: [{
            type: 'absence',
            absence: { $in: [PAID_LEAVE, UNPAID_LEAVE, MATERNITY_LEAVE, PATERNITY_LEAVE, PARENTAL_LEAVE, ILLNESS, UNJUSTIFIED, WORK_ACCIDENT, TRANSPORT_ACCIDENT] },
            startDate: { $lt: moment(query.endDate).endOf('day').toDate() },
            endDate: { $gt: moment('2020-10-29T10:31:00').toDate() },
            company: companyId,
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'auxiliary',
            select: 'serialNumber identity',
            populate: [{ path: 'contracts' }, { path: 'establishment' }],
          }],
        },
        { query: 'populate', args: [{ path: 'extension', select: 'startDate' }] },
        { query: 'sort', args: [{ startDate: 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return absence from query start date', async () => {
    const companyId = new ObjectId();
    const absences = [{ _id: new ObjectId() }];
    const query = { startDate: '2020-11-01T00:00:00', endDate: '2020-11-30T22:00:00' };

    findPay.returns(SinonMongoose.stubChainedQueries([], ['sort', 'limit', 'lean']));
    findEvent.returns(SinonMongoose.stubChainedQueries(absences, ['populate', 'sort', 'lean']));

    const result = await Absences123PayHelper.getAbsences(query, { company: { _id: companyId } });

    expect(result).toEqual(absences);
    SinonMongoose.calledOnceWithExactly(
      findPay,
      [
        { query: 'find', args: [{ date: { $gte: moment('2020-10-01T00:00:00').toDate() }, company: companyId }] },
        { query: 'sort', args: [{ createdAt: -1 }] },
        { query: 'limit', args: [1] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findEvent,
      [
        {
          query: 'find',
          args: [{
            type: 'absence',
            absence: { $in: [PAID_LEAVE, UNPAID_LEAVE, MATERNITY_LEAVE, PATERNITY_LEAVE, PARENTAL_LEAVE, ILLNESS, UNJUSTIFIED, WORK_ACCIDENT, TRANSPORT_ACCIDENT] },
            startDate: { $lt: moment(query.endDate).endOf('day').toDate() },
            endDate: { $gt: moment(query.startDate).startOf('day').toDate() },
            company: companyId,
          },
          ],
        },
        {
          query: 'populate',
          args: [{
            path: 'auxiliary',
            select: 'serialNumber identity',
            populate: [{ path: 'contracts' }, { path: 'establishment' }],
          }],
        },
        { query: 'populate', args: [{ path: 'extension', select: 'startDate' }] },
        { query: 'sort', args: [{ startDate: 1 }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('exportsAbsence', () => {
  let getAbsences;
  let getAbsenceHours;
  let exportToTxt;
  beforeEach(() => {
    getAbsences = sinon.stub(Absences123PayHelper, 'getAbsences');
    getAbsenceHours = sinon.stub(DraftPayHelper, 'getAbsenceHours');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
    process.env.AP_SOC = 'ap_soc';
  });
  afterEach(() => {
    getAbsences.restore();
    getAbsenceHours.restore();
    exportToTxt.restore();
    process.env.AP_SOC = '';
  });

  it('should export daily absence for auxiliary with contract', async () => {
    const companyId = new ObjectId();
    const query = { startDate: '2020-11-01T00:00:00', endDate: '2020-11-30T22:00:00' };
    const absences = [{
      absenceNature: 'daily',
      absence: 'leave',
      startDate: '2020-11-21T00:00:00',
      endDate: '2020-11-23T23:00:00',
      auxiliary: {
        contracts: [
          { endDate: '2019-11-01T00:00:00', startDate: '2018-02-01T00:00:00', serialNumber: 'contract' },
          { startDate: '2020-09-21T00:00:00', serialNumber: 'contract' }],
        establishment: { siret: '100009876' },
        serialNumber: '0987654321',
        identity: { lastname: 'Compani' },
      },
      extension: { _id: new ObjectId(), startDate: '2020-11-19T00:00:00' },
    }];

    getAbsences.returns(absences);
    getAbsenceHours.onCall(0).returns(5);
    getAbsenceHours.onCall(1).returns(0);
    getAbsenceHours.onCall(2).returns(4);
    exportToTxt.returns('file');

    const result = await Absences123PayHelper.exportAbsences(query, { company: { _id: companyId } });

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(getAbsences, query, { company: { _id: companyId } });
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [
        ['ap_soc', 'ap_etab', 'ap_matr', 'fs_nom', 'ap_contrat', 'va_abs_code', 'va_abs_deb', 'va_abs_fin', 'va_abs_premier_arret', 'va_abs_prolongation', 'va_abs_date', 'va_abs_nb22', 'va_abs_nb26', 'va_abs_nb30', 'va_abs_nbh'],
        ['ap_soc', '09876', '0987654321', 'Compani', 'contract', 'CPL', '21/11/2020', '23/11/2020', '0', '19/11/2020', '21/11/2020', 0, 1, 1, 5],
        ['ap_soc', '09876', '0987654321', 'Compani', 'contract', 'CPL', '21/11/2020', '23/11/2020', '0', '19/11/2020', '22/11/2020', 0, 0, 1, 0],
        ['ap_soc', '09876', '0987654321', 'Compani', 'contract', 'CPL', '21/11/2020', '23/11/2020', '0', '19/11/2020', '23/11/2020', 1, 1, 1, 4],
      ]
    );
    sinon.assert.calledWithExactly(
      getAbsenceHours.getCall(0),
      { absenceNature: 'daily', startDate: '2020-11-20T23:00:00.000Z', endDate: '2020-11-21T22:59:59.999Z' },
      [{ startDate: '2020-09-21T00:00:00', serialNumber: 'contract' }]
    );
    sinon.assert.calledWithExactly(
      getAbsenceHours.getCall(1),
      { absenceNature: 'daily', startDate: '2020-11-21T23:00:00.000Z', endDate: '2020-11-22T22:59:59.999Z' },
      [{ startDate: '2020-09-21T00:00:00', serialNumber: 'contract' }]
    );
    sinon.assert.calledWithExactly(
      getAbsenceHours.getCall(2),
      { absenceNature: 'daily', startDate: '2020-11-22T23:00:00.000Z', endDate: '2020-11-23T22:59:59.999Z' },
      [{ startDate: '2020-09-21T00:00:00', serialNumber: 'contract' }]
    );
    sinon.assert.callCount(getAbsenceHours, 3);
  });

  it('should export hourly absence for auxiliary with contract', async () => {
    const companyId = new ObjectId();
    const query = { startDate: '2020-11-01T00:00:00', endDate: '2020-11-30T22:00:00' };
    const absences = [{
      absenceNature: 'hourly',
      absence: 'leave',
      startDate: '2020-11-21T10:00:00',
      endDate: '2020-11-21T12:00:00',
      auxiliary: {
        contracts: [
          { endDate: '2019-11-01T00:00:00', startDate: '2018-02-01T00:00:00', serialNumber: 'contract' },
          { startDate: '2020-09-21T00:00:00', serialNumber: 'contract' }],
        establishment: { siret: '100009876' },
        serialNumber: '0987654321',
        identity: { lastname: 'Toto' },
      },
    }];

    getAbsences.returns(absences);
    getAbsenceHours.returns(2);
    exportToTxt.returns('file');

    const result = await Absences123PayHelper.exportAbsences(query, { company: { _id: companyId } });

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(getAbsences, query, { company: { _id: companyId } });
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [
        ['ap_soc', 'ap_etab', 'ap_matr', 'fs_nom', 'ap_contrat', 'va_abs_code', 'va_abs_deb', 'va_abs_fin', 'va_abs_premier_arret', 'va_abs_prolongation', 'va_abs_date', 'va_abs_nb22', 'va_abs_nb26', 'va_abs_nb30', 'va_abs_nbh'],
        ['ap_soc', '09876', '0987654321', 'Toto', 'contract', 'CPL', '21/11/2020', '21/11/2020', '1', '21/11/2020', '21/11/2020', 0, 1, 1, 2],
      ]
    );
    sinon.assert.calledOnceWithExactly(
      getAbsenceHours,
      absences[0],
      [{ startDate: '2020-09-21T00:00:00', serialNumber: 'contract' }]
    );
  });
});
