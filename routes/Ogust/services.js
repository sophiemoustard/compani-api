// 'use strict';

// const Joi = require('joi');

// dconst {
//   list,
//   getById,
// } = require('../../controllers/Ogust/customerController');

// exports.plugin = {
//   name: 'routes-ogust-customers',
//   register: async (server) => {
//     // Get all customers
//     server.route({
//       method: 'GET',
//       path: '/',
//       options: {
//         validate: {
//           headers: Joi.object().keys({
//             'x-ogust-token': Joi.string().required()
//           }).options({ allowUnknown: true }),
//           query: {
//             email: Joi.string().email(),
//             status: Joi.string().default('A'),
//             last_name: Joi.string(),
//             sector: Joi.string(),
//             nbperpage: Joi.number().default(50),
//             pagenum: Joi.number().default(1)
//           }
//         },
//         auth: false
//       },
//       handler: list
//     });
//     // Get customer by id
//     server.route({
//       method: 'GET',
//       path: '/{id}',
//       options: {
//         validate: {
//           headers: Joi.object().keys({
//             'x-ogust-token': Joi.string().required()
//           }).options({ allowUnknown: true }),
//           params: { id: Joi.string() }
//         },
//         auth: false
//       },
//       handler: getById
//     });
//   },
// };

