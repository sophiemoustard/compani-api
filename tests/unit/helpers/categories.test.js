const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Category = require('../../../src/models/Category');
const CategoryHelper = require('../../../src/helpers/categories');

require('sinon-mongoose');

describe('create', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(Category.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should create a category', async () => {
    const newCategory = { name: 'ma catégorie' };
    const result = await CategoryHelper.create(newCategory);

    expect(result).toMatchObject(newCategory);
  });
});

describe('list', () => {
  let CategoryMock;
  beforeEach(() => {
    CategoryMock = sinon.mock(Category);
  });
  afterEach(() => {
    CategoryMock.restore();
  });

  it('should return categories', async () => {
    const categoriesList = [{ name: 'ma première catégorie' }, { name: 'ma seconde catégorie' }];

    CategoryMock.expects('find')
      .once()
      .chain('populate')
      .withExactArgs({ path: 'programsCount' })
      .chain('lean')
      .once()
      .returns(categoriesList);

    const result = await CategoryHelper.list();

    expect(result).toMatchObject(categoriesList);
  });
});

describe('update', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Category, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update name', async () => {
    const category = { _id: new ObjectID(), name: 'jour' };
    const payload = { name: 'nuit' };
    await CategoryHelper.update(category._id, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: category._id }, { $set: payload });
  });
});

describe('delete', () => {
  let deleteCategory;
  beforeEach(() => {
    deleteCategory = sinon.stub(Category, 'deleteOne');
  });
  afterEach(() => {
    deleteCategory.restore();
  });

  it('should remove a category', async () => {
    const categoryId = new ObjectID();
    await CategoryHelper.delete(categoryId);

    sinon.assert.calledWithExactly(deleteCategory, { _id: categoryId });
  });
});
