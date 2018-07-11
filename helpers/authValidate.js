exports.validate = async (decoded) => {
  const credentials = {
    _id: decoded._id,
    scope: [decoded.role, `user-${decoded._id}`]
  };
  return { isValid: true, credentials };
};
