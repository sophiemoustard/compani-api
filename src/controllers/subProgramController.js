const Boom = require('@hapi/boom');
const SubProgramHelper = require('../helpers/subPrograms');
const translate = require('../helpers/translate');

const { language } = translate;

const update = async (req) => {
  try {
    await SubProgramHelper.updateSubProgram(req.params._id, req.payload);

    return {
      message: translate[language].subProgramUpdated,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};


module.exports = {
  update,
};
