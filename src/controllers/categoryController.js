const Boom = require('@hapi/boom');
const CategoryHelper = require('../helpers/categories');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const categories = await CategoryHelper.list();

    return {
      message: categories.length ? translate[language].categoriesFound : translate[language].categoriesNotFound,
      data: { categories },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    await CategoryHelper.create(req.payload);

    return { message: translate[language].categoryCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
};
