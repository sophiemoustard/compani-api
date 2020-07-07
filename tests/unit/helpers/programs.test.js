const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const ProgramHelper = require('../../../src/helpers/programs');
require('sinon-mongoose');

describe('createProgram', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(Program.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should create a program', async () => {
    const newProgram = { name: 'name' };

    const result = await ProgramHelper.createProgram(newProgram);
    expect(result).toMatchObject(newProgram);
  });
});

describe('list', () => {
  let ProgramMock;
  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
  });
  afterEach(() => {
    ProgramMock.restore();
  });

  it('should return programs', async () => {
    const programsList = [{ name: 'name' }, { name: 'program' }];

    ProgramMock.expects('find')
      .withExactArgs({ type: 'toto' })
      .chain('lean')
      .once()
      .returns(programsList);

    const result = await ProgramHelper.list({ type: 'toto' });
    expect(result).toMatchObject(programsList);
  });
});

describe('getProgram', () => {
  let ProgramMock;
  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
  });
  afterEach(() => {
    ProgramMock.restore();
  });

  it('should return programs', async () => {
    const program = { _id: new ObjectID() };

    ProgramMock.expects('findOne')
      .withExactArgs({ _id: program._id })
      .chain('populate')
      .withExactArgs({ path: 'modules', populate: 'activities' })
      .chain('lean')
      .once()
      .returns(program);

    const result = await ProgramHelper.getProgram(program._id);
    expect(result).toMatchObject(program);
  });
});

describe('update', () => {
  let ProgramMock;
  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
  });
  afterEach(() => {
    ProgramMock.restore();
  });

  it('should return programs', async () => {
    const programId = new ObjectID();
    const payload = { name: 'toto' };

    ProgramMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: programId }, { $set: payload }, { new: true })
      .chain('lean')
      .once()
      .returns({ _id: programId, name: 'toto' });

    const result = await ProgramHelper.updateProgram(programId, payload);
    expect(result).toMatchObject({ _id: programId, name: 'toto' });
  });
});
