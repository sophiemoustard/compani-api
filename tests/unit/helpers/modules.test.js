const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const Module = require('../../../src/models/Module');
const ModuleHelper = require('../../../src/helpers/modules');
require('sinon-mongoose');

describe('updateModule', () => {
  let ModuleMock;

  beforeEach(() => {
    ModuleMock = sinon.mock(Module);
  });

  afterEach(() => {
    ModuleMock.restore();
  });

  it("should update a module's title", async () => {
    const module = { _id: new ObjectID(), title: 'jour' };
    const payload = { title: 'nuit' };
    const updatedModule = { ...module, ...payload };

    ModuleMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: module._id }, { $set: payload }, { new: true })
      .chain('lean')
      .once()
      .returns(updatedModule);

    const result = await ModuleHelper.updateModule(module._id, payload);

    expect(result).toMatchObject(updatedModule);
    ModuleMock.verify();
  });
});

describe('addModule', () => {
  let ProgramMock;
  let ModuleMock;

  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
    ModuleMock = sinon.mock(Module);
  });

  afterEach(() => {
    ProgramMock.restore();
    ModuleMock.restore();
  });

  const program = { _id: new ObjectID() };
  const newModule = { title: 'c\'est un module !' };
  it('should create a module', async () => {
    const moduleId = new ObjectID();
    ProgramMock.expects('countDocuments').withExactArgs({ _id: program._id }).returns(1);

    ModuleMock.expects('create').withExactArgs(newModule).returns({ _id: moduleId });

    const returnedProgram = { ...program, modules: [moduleId] };
    ProgramMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: program._id }, { $push: { modules: moduleId } }, { new: true })
      .chain('lean')
      .returns(returnedProgram);

    const result = await ModuleHelper.addModule(program._id, newModule);

    expect(result).toMatchObject(returnedProgram);
    ProgramMock.verify();
    ModuleMock.verify();
  });

  it('should return an error if program does not exist', async () => {
    try {
      ProgramMock.expects('countDocuments').withExactArgs({ _id: program._id }).returns(0);

      ModuleMock.expects('create').never();
      ProgramMock.expects('findOneAndUpdate').never();

      const result = await ModuleHelper.addModule(program._id, newModule);

      expect(result).toBeUndefined();
    } catch (e) {
      ProgramMock.verify();
      ModuleMock.verify();
    }
  });
});

