const sinon = require('sinon');
const expect = require('expect');
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
      .chain('lean')
      .once()
      .returns(categoriesList);

    const result = await CategoryHelper.list();
    expect(result).toMatchObject(categoriesList);
  });
});
