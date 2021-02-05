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
  let list;
  beforeEach(() => {
    list = sinon.stub(Attendance, 'find');
  });
  afterEach(() => {
    list.restore();
  });

  it('should return some courseSlots attendances', async () => {
    const courseSlot = new ObjectID();
    const attendancesList = [
      { trainee: new ObjectID(), courseSlot },
      { trainee: new ObjectID(), courseSlot },
    ];

    list.returns(SinonMongoose.stubChainedQueries([attendancesList]));

    const result = await AttendanceHelper.list([courseSlot]);

    expect(result).toMatchObject(attendancesList);
    SinonMongoose.calledWithExactly(list, [
      { query: 'find', args: [{ courseSlot: { $in: [courseSlot] } }] },
      { query: 'lean' },
    ]);
  });
});
