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

  it('should return some courseSlots attendances', async () => {
    const courseSlot = new ObjectID();
    const attendancesList = [
      { trainee: new ObjectID(), courseSlot },
      { trainee: new ObjectID(), courseSlot },
    ];

    find.returns(SinonMongoose.stubChainedQueries([attendancesList], ['lean']));

    const result = await AttendanceHelper.list([courseSlot]);

    expect(result).toMatchObject(attendancesList);
    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [{ courseSlot: { $in: [courseSlot] } }] },
      { query: 'lean' },
    ]);
  });
});
