const translate = require('../helpers/translate');
const User = require('../models/User');
const Role = require('../models/Role');

const language = translate.language;

exports.setNewRoles = async (req, res) => {
  try {
    const role = await Role.findOne({ name: 'Coach' });
    console.log(role);
    const users = await User.find().lean();
    console.log('users', users);
    users.forEach(async (user) => {
      if (user.role === 'coach') {
        console.log('VRAI');
        await User.findOneAndUpdate({ _id: user._id }, { $set: { role: role._id } });
      }
    });
    console.log('OK');
    return res.status(200).json({ success: true, message: 'OK' });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
  }
};
