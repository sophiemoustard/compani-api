'use strict';

exports.plugin = {
  name: 'routes-upload',
  register: async (server, options) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: (request, h) => {
        return h.response('HOORA!').code(200);
      }
    });
  }
};
