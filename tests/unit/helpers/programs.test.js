const sinon = require('sinon');
const flat = require('flat');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const ProgramHelper = require('../../../src/helpers/programs');
const CloudinaryHelper = require('../../../src/helpers/cloudinary');
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
      .chain('populate')
      .withExactArgs({ path: 'subPrograms', select: 'name' })
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

  it('should return the requested program', async () => {
    const program = { _id: new ObjectID(),
      subPrograms: [{ _id: new ObjectID(),
        steps: [{ _id: new ObjectID(),
          activities: [{ _id: new ObjectID(),
            cards: [{ _id: new ObjectID() }] }] }] }] };

    ProgramMock.expects('findOne')
      .withExactArgs({ _id: program._id })
      .chain('populate')
      .withExactArgs({
        path: 'subPrograms',
        populate: { path: 'steps', populate: { path: 'activities', populate: 'cards' } },
      })
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

  it('should update name', async () => {
    const programId = new ObjectID();
    const payload = { name: 'toto' };

    ProgramMock.expects('updateOne')
      .withExactArgs({ _id: programId }, { $set: payload })
      .returns({ _id: programId, name: 'toto' });

    const result = await ProgramHelper.updateProgram(programId, payload);
    expect(result).toMatchObject({ _id: programId, name: 'toto' });
  });

  it('should update image', async () => {
    const programId = new ObjectID();
    const payload = { image: { publicId: new ObjectID(), link: new ObjectID() } };

    ProgramMock.expects('updateOne')
      .withExactArgs({ _id: programId }, { $set: payload })
      .returns({ _id: programId, ...payload });

    const result = await ProgramHelper.updateProgram(programId, payload);
    expect(result).toMatchObject({ _id: programId, ...payload });
  });
});

describe('uploadImage', () => {
  let ProgramMock;
  let addImageStub;
  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
    addImageStub = sinon.stub(CloudinaryHelper, 'addImage')
      .returns({ public_id: 'azertyuiop', secure_url: 'https://compani.io' });
  });
  afterEach(() => {
    ProgramMock.restore();
    addImageStub.restore();
  });

  it('should upload image', async () => {
    const programId = new ObjectID();
    const payload = { file: new ArrayBuffer(32), fileName: 'illustration' };
    const programUpdatePayload = {
      image: {
        publicId: 'azertyuiop',
        link: 'https://compani.io',
      },
    };

    ProgramMock.expects('updateOne')
      .withExactArgs({ _id: programId }, { $set: flat(programUpdatePayload) })
      .once();

    await ProgramHelper.uploadImage(programId, payload);
    sinon.assert.calledOnce(addImageStub);
  });
});
