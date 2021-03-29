const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Attendance = require('../../../src/models/Attendance');
const AttendanceHelper = require('../../../src/helpers/attendances');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(Attendance.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should add an attendance', async () => {
    const newAttendance = { trainee: new ObjectID(), courseSlot: new ObjectID() };
    const result = await AttendanceHelper.create(newAttendance);

    expect(result).toMatchObject(newAttendance);
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Attendance, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return courseSlots\' attendances', async () => {
    const courseSlots = [new ObjectID(), new ObjectID()];
    const attendancesList = [
      { trainee: { _id: new ObjectID(), company: new ObjectID() }, courseSlot: courseSlots[0] },
      { trainee: { _id: new ObjectID(), company: new ObjectID() }, courseSlot: courseSlots[1] },
    ];

    find.returns(SinonMongoose.stubChainedQueries([attendancesList]));

    const result = await AttendanceHelper.list([courseSlots], null);

    expect(result).toMatchObject(attendancesList);
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ courseSlot: { $in: [courseSlots] } }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'company' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return all courseSlots attendances for a company', async () => {
    const companyId = new ObjectID();
    const otherCompanyId = new ObjectID();
    const courseSlots = [new ObjectID(), new ObjectID()];
    const attendancesList = [
      { trainee: { _id: new ObjectID(), company: companyId }, courseSlot: courseSlots[0] },
      { trainee: { _id: new ObjectID(), company: otherCompanyId }, courseSlot: courseSlots[1] },
    ];

    find.returns(SinonMongoose.stubChainedQueries([attendancesList]));

    const result = await AttendanceHelper.list([courseSlots], companyId);

    expect(result).toMatchObject([attendancesList[0]]);
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ courseSlot: { $in: [courseSlots] } }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'company' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('delete', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(Attendance, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should remove a category', async () => {
    const attendanceId = new ObjectID();
    await AttendanceHelper.delete(attendanceId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: attendanceId });
  });
});
