const User = require('../models/User');

exports.addPayDocument = async (userId, payDocument) => {
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        'administrative.payDocuments': payDocument,
      },
    }
  );
};
