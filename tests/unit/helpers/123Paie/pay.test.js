/* eslint-disable max-len */
const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const Pay = require('../../../../src/models/Pay');
const Pay123PayHelper = require('../../../../src/helpers/123paie/pay');
const FileHelper = require('../../../../src/helpers/file');
const SinonMongoose = require('../../sinonMongoose');

describe('exportPay', () => {
  let findPay;
  let exportToTxt;
  beforeEach(() => {
    findPay = sinon.stub(Pay, 'find');
    exportToTxt = sinon.stub(FileHelper, 'exportToTxt');
    process.env.AP_SOC = 'ap_soc';
  });
  afterEach(() => {
    findPay.restore();
    exportToTxt.restore();
    process.env.AP_SOC = '';
  });

  it('should export pay hours for not ended contract', async () => {
    const query = { startDate: '2021-03-01T00:00:00', endDate: '2021-03-31T23:59:59' };
    const companyId = new ObjectId();
    const payList = [
      {
        auxiliary: {
          serialNumber: 'serialNumber',
          contracts: [
            { startDate: '2022-04-01T14:00:18', endDate: '2022-07-08T14:00:18', serialNumber: 'wrong_contract' },
            { startDate: '2022-10-01T14:00:18', serialNumber: 'good_contract' },
          ],
          administrative: { transportInvoice: { transportType: 'public' } },
        },
        overtimeHours: 2,
        additionalHours: 4,
        surchargedAndExempt: 10,
        transport: 19,
        contractHours: 151,
        diff: {
          hoursBalance: 8,
          notSurchargedAndNotExempt: 2,
          notSurchargedAndExempt: 2,
          surchargedAndExempt: 2,
          surchargedAndExemptDetails: [],
          surchargedAndNotExempt: 2,
          surchargedAndNotExemptDetails: [],
          workedHours: 0,
          paidTransportHours: 3,
          internalHours: 9,
          absencesHours: 5,
        },
        startDate: '2022-11-01T14:00:18',
        endDate: '2022-11-28T14:00:18',
        holidaysHours: 12,
        hoursBalance: -8,
        hoursCounter: -20,
        hoursToWork: 20,
        month: '11-2022',
        mutual: false,
        notSurchargedAndExempt: 97,
        notSurchargedAndNotExempt: 43,
        surchargedAndExemptDetails: [
          {
            planId: 'qwertyuiop',
            sunday: { hours: 0.7 },
            publicHoliday: { hours: 5 },
            firstOfMay: { hours: 13 },
            firstOfJanuary: { hours: 14 },
            twentyFifthOfDecember: { hours: 16 },
            evening: { hours: 15 },
          },
        ],
        surchargedAndNotExempt: 3,
        surchargedAndNotExemptDetails: [],
        phoneFees: 35.7,
        workedHours: 143,
        paidTransportHours: 3,
        internalHours: 9,
        absencesHours: 5,
      },
    ];

    findPay.returns(SinonMongoose.stubChainedQueries(payList));
    exportToTxt.returns('file');

    const result = await Pay123PayHelper.exportPay(query, { company: { _id: companyId } });

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [
        ['ap_soc', 'ap_matr', 'ap_contrat', 'va_sai_report', 'va_sai_code', 'va_sai_lib', 'va_sai_base', 'va_sai_resultat', 'va_sai_taux'],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '090', 'Heures exo non majo', 99, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '255', 'Heures exo total', 111, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '145', 'Heures exo maj dimanche', 0.7, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '167', 'Heures exo maj ferié', 5, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '173', 'Heures exo maj 100%', 43, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '200', 'Heures exo maj soirée', 15, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '177', 'Heures non exo non majo', 45, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '115', 'Heures supplémentaires', 2, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '100', 'Heures complémentaires', 4, '', ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '430', 'Carte navigo', '', 19, ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '512', 'Frais téléphoniques', '', 35.7, ''],
        ['ap_soc', 'serialNumber', 'good_contract', 'T', '489', 'Frais kilométriques', '', 0, ''],
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findPay,
      [
        { query: 'find', args: [{ month: '03-2021', company: companyId }] },
        {
          query: 'populate',
          args: [{
            path: 'auxiliary',
            populate: { path: 'contracts', select: '_id serialNumber startDate endDate' },
            select: '_id serialNumber administrative.transportInvoice.transportType',
          }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should export pay hours for ended contract', async () => {
    const query = { startDate: '2021-03-01T00:00:00', endDate: '2021-03-31T23:59:59' };
    const companyId = new ObjectId();
    const payList = [
      {
        auxiliary: {
          serialNumber: 'serialNumber',
          contracts: [
            { startDate: '2022-04-01T14:00:18', endDate: '2022-12-08T14:00:18', serialNumber: 'ended_good_contract' },
            { startDate: '2023-02-01T14:00:18', serialNumber: 'wrong_contract' },
          ],
          administrative: { transportInvoice: { transportType: 'public' } },
        },
        overtimeHours: 2,
        additionalHours: 4,
        surchargedAndExempt: 10,
        transport: 19,
        contractHours: 151,
        diff: {
          hoursBalance: 8,
          notSurchargedAndNotExempt: 2,
          notSurchargedAndExempt: 2,
          surchargedAndExempt: 2,
          surchargedAndExemptDetails: [],
          surchargedAndNotExempt: 2,
          surchargedAndNotExemptDetails: [],
          workedHours: 0,
          paidTransportHours: 3,
          internalHours: 9,
          absencesHours: 5,
        },
        startDate: '2022-11-01T14:00:18',
        endDate: '2022-11-28T14:00:18',
        holidaysHours: 12,
        hoursBalance: -8,
        hoursCounter: -20,
        hoursToWork: 20,
        month: '11-2022',
        mutual: false,
        notSurchargedAndExempt: 97,
        notSurchargedAndNotExempt: 43,
        surchargedAndExemptDetails: [
          {
            planId: 'qwertyuiop',
            sunday: { hours: 0.7 },
            publicHoliday: { hours: 5 },
            firstOfMay: { hours: 13 },
            firstOfJanuary: { hours: 14 },
            twentyFifthOfDecember: { hours: 16 },
            evening: { hours: 15 },
          },
        ],
        surchargedAndNotExempt: 3,
        surchargedAndNotExemptDetails: [],
        phoneFees: 35.7,
        workedHours: 143,
        paidTransportHours: 3,
        internalHours: 9,
        absencesHours: 5,
      },
    ];

    findPay.returns(SinonMongoose.stubChainedQueries(payList));
    exportToTxt.returns('file');

    const result = await Pay123PayHelper.exportPay(query, { company: { _id: companyId } });

    expect(result).toEqual('file');
    sinon.assert.calledOnceWithExactly(
      exportToTxt,
      [
        ['ap_soc', 'ap_matr', 'ap_contrat', 'va_sai_report', 'va_sai_code', 'va_sai_lib', 'va_sai_base', 'va_sai_resultat', 'va_sai_taux'],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '090', 'Heures exo non majo', 99, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '255', 'Heures exo total', 111, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '145', 'Heures exo maj dimanche', 0.7, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '167', 'Heures exo maj ferié', 5, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '173', 'Heures exo maj 100%', 43, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '200', 'Heures exo maj soirée', 15, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '177', 'Heures non exo non majo', 45, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '115', 'Heures supplémentaires', 2, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '100', 'Heures complémentaires', 4, '', ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '430', 'Carte navigo', '', 19, ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '512', 'Frais téléphoniques', '', 35.7, ''],
        ['ap_soc', 'serialNumber', 'ended_good_contract', 'T', '489', 'Frais kilométriques', '', 0, ''],
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findPay,
      [
        { query: 'find', args: [{ month: '03-2021', company: companyId }] },
        {
          query: 'populate',
          args: [{
            path: 'auxiliary',
            populate: { path: 'contracts', select: '_id serialNumber startDate endDate' },
            select: '_id serialNumber administrative.transportInvoice.transportType',
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});
