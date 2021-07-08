'use strict';
var bcrypt = require('bcryptjs');
var csrf = require('csurf');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const authenticator = require('otplib').authenticator;

/**
 * Constructor for Authentication class
 *
 * @class Authentication
 * @param {Object[]} validUsers
 * @param {boolean} useEncryptedPasswords
 */
function Authentication(validUsers, useEncryptedPasswords, mountPath) {
  this.validUsers = validUsers;
  this.useEncryptedPasswords = useEncryptedPasswords || false;
  this.mountPath = mountPath;
}

function initialize(app, options) {
  options = options || {};
  var self = this;
  passport.use('local', new LocalStrategy(
    {passReqToCallback:true},
    function(req, username, password, cb) {
      var match = self.authenticate({
        name: username,
        pass: password,
        otpCode: req.body.otpCode
      });
      if (!match.matchingUsername) {
        return cb(null, false, { message: 'Invalid username or password' });
      }
      cb(null, match.matchingUsername);
    })
  );

  passport.serializeUser(function(username, cb) {
    cb(null, username);
  });

  passport.deserializeUser(function(username, cb) {
    var user = self.authenticate({
      name: username
    }, true);
    cb(null, user);
  });

  var cookieSessionSecret = options.cookieSessionSecret || require('crypto').randomBytes(64).toString('hex');
  app.use(require('connect-flash')());
  app.use(require('body-parser').urlencoded({ extended: true }));
  app.use(require('cookie-session')({
    key    : 'parse_dash',
    secret : cookieSessionSecret,
    cookie : {
      maxAge: (2 * 7 * 24 * 60 * 60 * 1000) // 2 weeks
    }
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.post('/login',
    csrf(),
    passport.authenticate('local', {
      successRedirect: `${self.mountPath}apps`,
      failureRedirect: `${self.mountPath}login`,
      failureFlash : true
    })
  );

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect(`${self.mountPath}login`);
  });
}

/**
 * Authenticates the `userToTest`
 *
 * @param {Object} userToTest
 * @returns {Object} Object with `isAuthenticated` and `appsUserHasAccessTo` properties
 */
function authenticate(userToTest, usernameOnly) {
  let appsUserHasAccessTo = null;
  let matchingUsername = null;
  let isReadOnly = false;

  //they provided auth
  let isAuthenticated = userToTest &&
    //there are configured users
    this.validUsers &&
    //the provided auth matches one of the users
    this.validUsers.find(user => {
      let isAuthenticated = false;
      let otpValidated = true;
      if (user.mfa && !usernameOnly) {
        if (!userToTest.otpCode) {
          otpValidated = false;
        }
        if (!authenticator.verify({ token:userToTest.otpCode, secret: user.mfa })) {
          otpValidated = false;
        }
      }
      let usernameMatches = userToTest.name == user.user;
      let passwordMatches = this.useEncryptedPasswords && !usernameOnly ? bcrypt.compareSync(userToTest.pass, user.pass) : userToTest.pass == user.pass;
      if (usernameMatches && (usernameOnly || passwordMatches) && otpValidated) {
        isAuthenticated = true;
        matchingUsername = user.user;
        // User restricted apps
        appsUserHasAccessTo = user.apps || null;
        isReadOnly = !!user.readOnly; // make it true/false
      }
      return isAuthenticated;
    }) ? true : false;

  return {
    isAuthenticated,
    matchingUsername,
    appsUserHasAccessTo,
    isReadOnly,
  };
}

Authentication.prototype.initialize = initialize;
Authentication.prototype.authenticate = authenticate;

module.exports = Authentication;
