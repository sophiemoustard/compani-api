"use strict";

// const uuid = require('uuid/v4');

// 'secret': uuid(),
// http://localhost:3000
module.exports = {
  token: {
    'secret': process.env.TOKEN_SECRET,
    'expiresIn': '24h'
  },
  facebook: {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'https://alenvi-webapp.herokuapp.com/api/users/authenticate/facebook/callback',
    session: false,
    profileFields: ['id', 'emails', 'name', 'photos']
  },
}
