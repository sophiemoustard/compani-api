const FormData = require('form-data');

exports.generateFormData = (payload) => {
  const form = new FormData();

  for (const k in payload) {
    form.append(k, payload[k]);
  }
  return form;
};
