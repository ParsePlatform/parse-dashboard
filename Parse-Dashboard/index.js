/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
// Command line tool for npm start
'use strict'
const path = require('path');
const jsonFile = require('json-file-plus');
const express = require('express');
const parseDashboard = require('./app');
const authenticator = require('otplib').authenticator;

const program = require('commander');
program.option('--appId [appId]', 'the app Id of the app you would like to manage.');
program.option('--masterKey [masterKey]', 'the master key of the app you would like to manage.');
program.option('--serverURL [serverURL]', 'the server url of the app you would like to manage.');
program.option('--graphQLServerURL [graphQLServerURL]', 'the GraphQL server url of the app you would like to manage.');
program.option('--dev', 'Enable development mode. This will disable authentication and allow non HTTPS connections. DO NOT ENABLE IN PRODUCTION SERVERS');
program.option('--appName [appName]', 'the name of the app you would like to manage. Optional.');
program.option('--config [config]', 'the path to the configuration file');
program.option('--host [host]', 'the host to run parse-dashboard');
program.option('--port [port]', 'the port to run parse-dashboard');
program.option('--mountPath [mountPath]', 'the mount path to run parse-dashboard');
program.option('--allowInsecureHTTP [allowInsecureHTTP]', 'set this flag when you are running the dashboard behind an HTTPS load balancer or proxy with early SSL termination.');
program.option('--sslKey [sslKey]', 'the path to the SSL private key.');
program.option('--sslCert [sslCert]', 'the path to the SSL certificate.');
program.option('--generateMFA [username]', 'helper tool to allow you to generate secure MFA secrets.');
program.option('--trustProxy [trustProxy]', 'set this flag when you are behind a front-facing proxy, such as when hosting on Heroku.  Uses X-Forwarded-* headers to determine the client\'s connection and IP address.');
program.option('--cookieSessionSecret [cookieSessionSecret]', 'set the cookie session secret, defaults to a random string. You should set that value if you want sessions to work across multiple server, or across restarts');

program.parse(process.argv);

const host = program.host || process.env.HOST || '0.0.0.0';
const port = program.port || process.env.PORT || 4040;
const mountPath = program.mountPath || process.env.MOUNT_PATH || '/';
const allowInsecureHTTP = program.allowInsecureHTTP || process.env.PARSE_DASHBOARD_ALLOW_INSECURE_HTTP;
const cookieSessionSecret = program.cookieSessionSecret || process.env.PARSE_DASHBOARD_COOKIE_SESSION_SECRET;
const trustProxy = program.trustProxy || process.env.PARSE_DASHBOARD_TRUST_PROXY;
const dev = program.dev;

if (trustProxy && allowInsecureHTTP) {
  console.log('Set only trustProxy *or* allowInsecureHTTP, not both.  Only one is needed to handle being behind a proxy.');
  process.exit(-1);
}

let explicitConfigFileProvided = !!program.config;
let configFile = null;
let configFromCLI = null;
let configServerURL = program.serverURL || process.env.PARSE_DASHBOARD_SERVER_URL;
let configGraphQLServerURL = program.graphQLServerURL || process.env.PARSE_DASHBOARD_GRAPHQL_SERVER_URL;
let configMasterKey = program.masterKey || process.env.PARSE_DASHBOARD_MASTER_KEY;
let configAppId = program.appId || process.env.PARSE_DASHBOARD_APP_ID;
let configAppName = program.appName || process.env.PARSE_DASHBOARD_APP_NAME;
let configUserId = program.userId || process.env.PARSE_DASHBOARD_USER_ID;
let configUserPassword = program.userPassword || process.env.PARSE_DASHBOARD_USER_PASSWORD;
let configSSLKey = program.sslKey || process.env.PARSE_DASHBOARD_SSL_KEY;
let configSSLCert = program.sslCert || process.env.PARSE_DASHBOARD_SSL_CERT;

if (program.generateMFA) {
  // I can't seem to get this working.
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(program.generateMFA, configAppName, secret);
  console.log(`MFA secret for ${program.generateMFA} is ${secret}\nDo not share this code. Set it as mfa for this user in parse-dashboard-config.json`);
  console.log(`OTPAUTH URL for ${program.generateMFA} is ${otpauth}\nShare this with ${program.generateMFA}`);
}

function handleSIGs(server) {
  const signals = {
    'SIGINT': 2,
    'SIGTERM': 15
  };
  function shutdown(signal, value) {
    server.close(function () {
      console.log('server stopped by ' + signal);
      process.exit(128 + value);
    });
  }
  Object.keys(signals).forEach(function (signal) {
    process.on(signal, function () {
      shutdown(signal, signals[signal]);
    });
  });
}

if (!program.config && !process.env.PARSE_DASHBOARD_CONFIG) {
  if (configServerURL && configMasterKey && configAppId) {
    configFromCLI = {
      data: {
        apps: [
          {
            appId: configAppId,
            serverURL: configServerURL,
            masterKey: configMasterKey,
            appName: configAppName,
          },
        ]
      }
    };
    if (configGraphQLServerURL) {
      configFromCLI.data.apps[0].graphQLServerURL = configGraphQLServerURL;
    }
    if (configUserId && configUserPassword) {
      configFromCLI.data.users = [
        {
          user: configUserId,
          pass: configUserPassword,
        }
      ];
    }
  } else if (!configServerURL && !configMasterKey && !configAppName) {
    configFile = path.join(__dirname, 'parse-dashboard-config.json');
  }
} else if (!program.config && process.env.PARSE_DASHBOARD_CONFIG) {
  configFromCLI = {
    data: JSON.parse(process.env.PARSE_DASHBOARD_CONFIG)
  };
} else {
  configFile = program.config;
  if (program.appId || program.serverURL || program.masterKey || program.appName || program.graphQLServerURL) {
    console.log('You must provide either a config file or other CLI options (appName, appId, masterKey, serverURL, and graphQLServerURL); not both.');
    process.exit(3);
  }
}

let p = null;
let configFilePath = null;
if (configFile) {
  p = jsonFile(configFile);
  configFilePath = path.dirname(configFile);
} else if (configFromCLI) {
  p = Promise.resolve(configFromCLI);
} else {
  //Failed to load default config file.
  console.log('You must provide either a config file or an app ID, Master Key, and server URL. See parse-dashboard --help for details.');
  process.exit(4);
}
p.then(config => {
  config.data.apps.forEach(app => {
    if (!app.appName) {
      app.appName = app.appId;
    }
  });

  if (config.data.iconsFolder && configFilePath) {
    config.data.iconsFolder = path.join(configFilePath, config.data.iconsFolder);
  }

  const app = express();

  if (allowInsecureHTTP || trustProxy || dev) app.enable('trust proxy');

  config.data.trustProxy = trustProxy;
  let dashboardOptions = { allowInsecureHTTP, cookieSessionSecret, dev };
  app.use(mountPath, parseDashboard(config.data, dashboardOptions));
  let server;
  if(!configSSLKey || !configSSLCert){
    // Start the server.
    server = app.listen(port, host, function () {
      console.log(`The dashboard is now available at http://${server.address().address}:${server.address().port}${mountPath}`);
    });
  } else {
    // Start the server using SSL.
    var fs = require('fs');
    var privateKey = fs.readFileSync(configSSLKey);
    var certificate = fs.readFileSync(configSSLCert);

    server = require('https').createServer({
      key: privateKey,
      cert: certificate
    }, app).listen(port, host, function () {
      console.log(`The dashboard is now available at https://${server.address().address}:${server.address().port}${mountPath}`);
    });
  }
  handleSIGs(server);
}, error => {
  if (error instanceof SyntaxError) {
    console.log('Your config file contains invalid JSON. Exiting.');
    process.exit(1);
  } else if (error.code === 'ENOENT') {
    if (explicitConfigFileProvided) {
      console.log('Your config file is missing. Exiting.');
      process.exit(2);
    } else {
      console.log('You must provide either a config file or required CLI options (app ID, Master Key, and server URL); not both.');
      process.exit(3);
    }
  } else {
    console.log('There was a problem with your config. Exiting.');
    process.exit(-1);
  }
})
.catch(error => {
  console.log('There was a problem loading the dashboard. Exiting.', error);
  process.exit(-1);
});
