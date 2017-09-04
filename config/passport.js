"use strict";

const passport          = require('passport');
const FacebookStrategy  = require('passport-facebook').Strategy;
const facebookConfig    = require('./strategies').facebook;
const _                 = require('lodash');

const User = require('../models/User');

passport.use(new FacebookStrategy(facebookConfig, function(accessToken, refreshToken, profile, done) {
  // console.log("accesToken ", accessToken);
  // console.log("refreshToken", refreshToken);
  // console.log("profile", profile);
  process.nextTick(function() {
    var payload = {
      "facebook.facebookId": profile.id,
      "facebook.email": profile.emails[0].value,
      "facebook.access_token": accessToken
    };
    User.findOneAndUpdate({'facebook.facebookId': profile.id}, payload, {'upsert': false}, function(err, user) {
      if(err) {
        return done(err);
      } else {
        return done(null, user);
      }
    });
    // User.findOne({'facebook.facebookId': profile.id}, function(err, user) {
    //   if (err) {
    //     return done(err);
    //   }
    //   if (!user) {
    //     var payload = {
    //       "facebook.facebookId": profile.id,
    //       "facebook.email": profile.emails[0].value,
    //       "facebook.access_token": accessToken
    //     };
    //     var newPayload = _.pickBy(payload);
    //     var newUser = User(
    //       newPayload
    //     );
    //     newUser.save(function(err, user) {
    //       if (err) {
    //         console.error(err);
    //         if (err)
    //           return response.error(res, 500, translate[language].unexpectedBehavior);
    //       }
    //       // user.
    //       // return response.success(res, translate[language].userSaved, user);
    //       //user = {};
    //       done(err, user);
    //     });
    //   }
    //   else {
    //     done(err, user);
    //   }
    // })
  })
}));

passport.serializeUser(function(user, done) {
  done(null, user);
})

passport.deserializeUser(function(obj, done) {
  done(null, obj);
})
