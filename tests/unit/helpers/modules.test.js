const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const Module = require('../../../src/models/Module');
const ModuleHelper = require('../../../src/helpers/modules');
require('sinon-mongoose');

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
  it('should create a module', async () => {
    const newModule = { title: 'c\'est un module !' };
    const moduleId = new ObjectID();
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
});

