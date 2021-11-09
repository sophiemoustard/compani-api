const { ObjectID } = require('bson');
const sinon = require('sinon');
const CustomerAbsence = require('../../src/models/CustomerAbsence');
const CustomerAbsenceHelper = require('../../src/helpers/customerAbsences');

describe('createAbsence', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(CustomerAbsence, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create customer absence', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    const payload = {
      startDate: new Date(),
      endDate: new Date(),
      customer: new ObjectID(),
      absenceType: 'leave',
    };
    await CustomerAbsenceHelper.create(payload, credentials);

    sinon.assert.calledOnceWithExactly(create, { ...payload, company: credentials.company._id });
  });
});
