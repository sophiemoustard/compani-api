const sinon = require('sinon');
const { expect } = require('expect');
const moment = require('../../../src/extensions/moment');
const ContractHelper = require('../../../src/helpers/contracts');
const UtilsHelper = require('../../../src/helpers/utils');

describe('getContractInfo', () => {
  let getDaysRatioBetweenTwoDates;
  beforeEach(() => {
    getDaysRatioBetweenTwoDates = sinon.stub(UtilsHelper, 'getDaysRatioBetweenTwoDates');
  });
  afterEach(() => {
    getDaysRatioBetweenTwoDates.restore();
  });

  it('Case 1. One version no sunday', () => {
    const versions = [{ endDate: '', startDate: '2019-05-04', weeklyHours: 20 }];
    const query = { startDate: '2019-06-03', endDate: '2019-06-07' };
    getDaysRatioBetweenTwoDates.returns({ businessDays: 4, sundays: 0, holidays: 0 });

    const result = ContractHelper
      .getContractInfo(versions, query, { businessDays: 10, sundays: 0, holidays: 0 }, false);

    expect(result).toBeDefined();
    expect(result.contractHours).toBe(8);
    expect(result.workedDaysRatio).toBe(0.4);
    expect(result.holidaysHours).toBe(0);
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-06-03').toDate(),
      moment('2019-06-07').toDate(),
      false
    );
  });

  it('Case 2. One version and sunday included', () => {
    const versions = [{ endDate: '', startDate: '2019-05-04', weeklyHours: 24 }];
    const query = { startDate: '2019-06-03', endDate: '2019-06-09' };
    getDaysRatioBetweenTwoDates.returns({ businessDays: 4, sundays: 1, holidays: 0 });

    const result = ContractHelper
      .getContractInfo(versions, query, { businessDays: 10, sundays: 0, holidays: 0 }, false);

    expect(result).toBeDefined();
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-06-03').startOf('d').toDate(),
      moment('2019-06-09').toDate(),
      false
    );
  });

  it('Case 3. Multiple versions', () => {
    const versions = [
      { startDate: '2019-01-01', endDate: '2019-07-04', weeklyHours: 18 },
      { endDate: '', startDate: '2019-07-04', weeklyHours: 24 },
    ];
    const query = { startDate: '2019-06-27', endDate: '2019-07-05' };
    getDaysRatioBetweenTwoDates.returns({ businessDays: 4, sundays: 1, holidays: 0 });

    const result = ContractHelper
      .getContractInfo(versions, query, { businessDays: 10, sundays: 0, holidays: 0 }, false);

    expect(result).toBeDefined();
    sinon.assert.calledTwice(getDaysRatioBetweenTwoDates);
  });

  it('Case 4. One version and holiday included', () => {
    const versions = [{ endDate: '', startDate: '2019-05-04', weeklyHours: 24 }];
    const query = { startDate: '2019-05-04', endDate: '2019-05-10' };
    getDaysRatioBetweenTwoDates.returns({ businessDays: 4, sundays: 0, holidays: 1 });

    const result = ContractHelper.getContractInfo(versions, query, { businessDays: 10, sundays: 0, holidays: 0 }, true);

    expect(result).toBeDefined();
    expect(result.contractHours).toBe(12);
    expect(result.workedDaysRatio).toBe(0.5);
    expect(result.holidaysHours).toBe(4);
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-05-04')
        .startOf('d')
        .toDate(),
      moment('2019-05-10').toDate(),
      true
    );
  });
});

describe('auxiliaryHasActiveContractOnDay', () => {
  it('should return false as no contract', () => {
    const contracts = [];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return false as no contract on day (startDate after day)', () => {
    const contracts = [{ startDate: '2019-03-11T08:38:18' }];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return false as no contract on day (end date before day)', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18', endDate: '2019-01-10T08:38:18' }];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return true as contract on day (end date after day)', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18', endDate: '2019-01-31T08:38:18' }];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeTruthy();
  });

  it('should return true as contract on day (no endDate)', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18' }];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeTruthy();
  });
});

describe('auxiliaryHasActiveContractBetweenDates', () => {
  it('should return true if auxiliary has contract that start before the start date and don\'t end', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18.000Z' }];
    const startDate = '2020-01-01T08:38:18.000Z';
    const endDate = '2020-01-04T08:38:18.000Z';

    const result = ContractHelper.auxiliaryHasActiveContractBetweenDates(contracts, startDate, endDate);

    expect(result).toBe(true);
  });

  it('should return true if auxiliary has contract that start before the start date and end after the endDate', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18.000Z', endDate: '2021-01-04T08:38:18.000Z' }];
    const startDate = '2020-01-01T08:38:18.000Z';
    const endDate = '2020-01-04T08:38:18.000Z';

    const result = ContractHelper.auxiliaryHasActiveContractBetweenDates(contracts, startDate, endDate);

    expect(result).toBe(true);
  });

  it('should return false if auxiliary has contract that start after the start date', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18.000Z' }];
    const startDate = '2018-01-01T08:38:18.000Z';
    const endDate = '2018-01-04T08:38:18.000Z';

    const result = ContractHelper.auxiliaryHasActiveContractBetweenDates(contracts, startDate, endDate);

    expect(result).toBe(false);
  });

  it('should return false if auxiliary has contract that end before the end date', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18.000Z', endDate: '2019-01-03T08:38:18.000Z' }];
    const startDate = '2019-01-01T08:38:18.000Z';
    const endDate = '2019-01-04T08:38:18.000Z';

    const result = ContractHelper.auxiliaryHasActiveContractBetweenDates(contracts, startDate, endDate);

    expect(result).toBe(false);
  });

  it('should return true if auxiliary has not ending contract and endDate is not given as an argument', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18.000Z' }];
    const startDate = '2019-01-01T08:38:18.000Z';

    const result = ContractHelper.auxiliaryHasActiveContractBetweenDates(contracts, startDate);

    expect(result).toBe(true);
  });

  it('should return false if auxiliary has ending contract and endDate is not given as an argument', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18.000Z', endDate: '2019-01-03T08:38:18.000Z' }];
    const startDate = '2019-01-01T08:38:18.000Z';

    const result = ContractHelper.auxiliaryHasActiveContractBetweenDates(contracts, startDate);

    expect(result).toBe(false);
  });
});
