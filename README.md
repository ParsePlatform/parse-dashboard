# Parse Dashboard

[![Greenkeeper badge](https://badges.greenkeeper.io/parse-community/parse-dashboard.svg)](https://greenkeeper.io/)
[![Build Status](https://img.shields.io/travis/parse-community/parse-dashboard/master.svg?style=flat)](https://travis-ci.org/parse-community/parse-dashboard)
[![npm version](https://img.shields.io/npm/v/parse-dashboard.svg?style=flat)](https://www.npmjs.com/package/parse-dashboard)
[![Join The Conversation](https://img.shields.io/discourse/https/community.parseplatform.org/topics.svg)](https://community.parseplatform.org/c/parse-server)
[![Backers on Open Collective](https://opencollective.com/parse-server/backers/badge.svg)][open-collective-link]
[![Sponsors on Open Collective](https://opencollective.com/parse-server/sponsors/badge.svg)][open-collective-link]
[![License][license-svg]][license-link]
[![Twitter Follow](https://img.shields.io/twitter/follow/ParsePlatform.svg?label=Follow%20us%20on%20Twitter&style=social)](https://twitter.com/intent/follow?screen_name=ParsePlatform)

Parse Dashboard is a standalone dashboard for managing your [Parse Server](https://github.com/ParsePlatform/parse-server) apps.

* [Getting Started](#getting-started)
* [Local Installation](#local-installation)
  * [Configuring Parse Dashboard](#configuring-parse-dashboard)
    * [File](#file)
    * [Environment variables](#environment-variables)
      * [Multiple apps](#multiple-apps)
      * [Single app](#single-app)
  * [Managing Multiple Apps](#managing-multiple-apps)
  * [GraphQL Playground](#graphql-playground)    
  * [App Icon Configuration](#app-icon-configuration)
  * [App Background Color Configuration](#app-background-color-configuration)
  * [Other Configuration Options](#other-configuration-options)
    * [Prevent columns sorting](#prevent-columns-sorting)
* [Running as Express Middleware](#running-as-express-middleware)
* [Deploying Parse Dashboard](#deploying-parse-dashboard)
  * [Preparing for Deployment](#preparing-for-deployment)
  * [Security Considerations](#security-considerations)
    * [Configuring Basic Authentication](#configuring-basic-authentication)
    * [Separating App Access Based on User Identity](#separating-app-access-based-on-user-identity)
  * [Use Read-Only masterKey](#use-read-only-masterKey)
    * [Making an app read-only for all users](#making-an-app-read-only-for-all-users)
    * [Makings users read-only](#makings-users-read-only)
    * [Making user's apps readOnly](#making-users-apps-readonly)
  * [Configuring Localized Push Notifications](#configuring-localized-push-notifications)
  * [Run with Docker](#run-with-docker)
* [Contributing](#contributing)

# Getting Started

[Node.js](https://nodejs.org) version >= 8.9 is required to run the dashboard. You also need to be using Parse Server version 2.1.4 or higher.

# Local Installation

Install the dashboard from `npm`.

```
npm install -g parse-dashboard
```

You can launch the dashboard for an app with a single command by supplying an app ID, master key, URL, and name like this:

```
parse-dashboard --dev --appId yourAppId --masterKey yourMasterKey --serverURL "https://example.com/parse" --appName optionalName
```

You may set the host, port and mount path by supplying the `--host`, `--port` and `--mountPath` options to parse-dashboard. You can use anything you want as the app name, or leave it out in which case the app ID will be used.

NB: the `--dev` parameter is disabling production-ready security features, do not use this parameter when starting the dashboard in production. This parameter is useful if you are running on docker. 

After starting the dashboard, you can visit http://localhost:4040 in your browser:

![Parse Dashboard](.github/dash-shot.png)

## Configuring Parse Dashboard

### File

You can also start the dashboard from the command line with a config file.  To do this, create a new file called `parse-dashboard-config.json` inside your local Parse Dashboard directory hierarchy.  The file should match the following format:

```json
{
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "MyApp"
    }
  ]
}
```

You can then start the dashboard using `parse-dashboard --config parse-dashboard-config.json`.

### Environment variables

> This only works when starting the app using the `parse-dashboard` command

There are also two methods you can use to configure the dashboard using environment variables.

#### Multiple apps

Provide the entire JSON configuration in `PARSE_DASHBOARD_CONFIG` and it will be parsed just like the config file.

#### Single app

You can also define each configuration option individually.

```
HOST: "0.0.0.0"
PORT: "4040"
MOUNT_PATH: "/"
PARSE_DASHBOARD_TRUST_PROXY: undefined // Or "1" to trust connection info from a proxy's X-Forwarded-* headers
PARSE_DASHBOARD_SERVER_URL: "http://localhost:1337/parse"
PARSE_DASHBOARD_MASTER_KEY: "myMasterKey"
PARSE_DASHBOARD_APP_ID: "myAppId"
PARSE_DASHBOARD_APP_NAME: "MyApp"
PARSE_DASHBOARD_USER_ID: "user1"
PARSE_DASHBOARD_USER_PASSWORD: "pass"
PARSE_DASHBOARD_SSL_KEY: "sslKey"
PARSE_DASHBOARD_SSL_CERT: "sslCert"
PARSE_DASHBOARD_CONFIG: undefined // Only for reference, it must not exist
PARSE_DASHBOARD_COOKIE_SESSION_SECRET: undefined // set the cookie session secret, defaults to a random string. Use this option if you want sessions to work across multiple servers, or across restarts

```

## Managing Multiple Apps

Managing multiple apps from the same dashboard is also possible. Simply add additional entries into the `parse-dashboard-config.json` file's `"apps"` array:

```json
{
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse", // Self-hosted Parse Server
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "My Parse Server App"
    },
    {
      "serverURL": "http://localhost:1337/parse2", // Self-hosted Parse Server
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "My Parse Server App 2"
    }
  ]
}
```

## GraphQL Playground

Parse Dashboard has a built-in GraphQL Playground to play with the auto-generated [Parse GraphQL API](https://github.com/parse-community/parse-server#graphql).

You can setup the GraphQL Playground by passing the `--graphQLServerURL` option to the `parse-dashboard` CLI:

```
parse-dashboard --dev --appId yourAppId --masterKey yourMasterKey --serverURL "https://example.com/parse" --graphQLServerURL "https://example.com/graphql" --appName optionalName
```

The `graphQLServerURL` option is also available through an environment variable called `PARSE_DASHBOARD_GRAPHQL_SERVER_URL`:

```
HOST: "0.0.0.0"
PORT: "4040"
MOUNT_PATH: "/"
PARSE_DASHBOARD_SERVER_URL: "http://localhost:1337/parse"
PARSE_DASHBOARD_GRAPHQL_SERVER_URL: "http://localhost:1337/graphql"
PARSE_DASHBOARD_MASTER_KEY: "myMasterKey"
PARSE_DASHBOARD_APP_ID: "myAppId"
PARSE_DASHBOARD_APP_NAME: "MyApp"
```

You can also setup the GraphQL Playground in your `parse-dashboard-config.json` file:

```json
{
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "graphQLServerURL": "http://localhost:1337/graphql",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "My Parse Server App"
    },
    {
      "serverURL": "http://localhost:1337/parse2",
      "graphQLServerURL": "http://localhost:1337/graphql2",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "My Parse Server App 2"
    }
  ]
}
```

After starting the dashboard, you can visit http://0.0.0.0:4040/apps/MyTestApp/api_console/graphql in your browser:

![Parse Dashboard GraphQL Playground](.github/graphql-playground.png)

## App Icon Configuration

Parse Dashboard supports adding an optional icon for each app, so you can identify them easier in the list. To do so, you *must* use the configuration file, define an `iconsFolder` in it, and define the `iconName` parameter for each app (including the extension). The path of the `iconsFolder` is relative to the configuration file. If you have installed ParseDashboard globally you need to use the full path as value for the `iconsFolder`. To visualize what it means, in the following example `icons` is a directory located under the same directory as the configuration file:

```json
{
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "My Parse Server App",
      "iconName": "MyAppIcon.png",
    }
  ],
  "iconsFolder": "icons"
}
```

## App Background Color Configuration

Parse Dashboard supports adding an optional background color for each app, so you can identify them easier in the list. To do so, you *must* use the configuration file, define an `primaryBackgroundColor` and `secondaryBackgroundColor` in it, parameter for each app. It is `CSS style`. To visualize what it means, in the following example `backgroundColor` is a configuration file:

```json
{
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "My Parse Server App",
      "primaryBackgroundColor": "#FFA500", // Orange
      "secondaryBackgroundColor": "#FF4500" // OrangeRed
    },
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "My Parse Server App [2]",
      "primaryBackgroundColor": "rgb(255, 0, 0)", // Red
      "secondaryBackgroundColor": "rgb(204, 0, 0)" // DarkRed
    }
  ]
}
```

## Custom branding

- You can set `customBrandIcon` with relative path from `iconsFolder`. This could be your custom logo which will appear on login screen and on the top of sidebar. Icon should be square (same height and width), SVG or PNG with transparent background. 
- You can set `customBrandTitle` which will be visible on top of sidebar instead of `Parse Dashboard`. 
- You can set `customBrandColorPrimary` which will be background color at login screen.

## Other Configuration Options

You can set `appNameForURL` in the config file for each app to control the url of your app within the dashboard. This can make it easier to use bookmarks or share links on your dashboard.

To change the app to production, simply set `production` to `true` in your config file. The default value is false if not specified.

 ### Prevent columns sorting  

You can prevent some columns to be sortable by adding `preventSort` to columnPreference options in each app configuration

```json

"apps": [
  {
    "appId": "local_app_id",
    "columnPreference": {
        "_User": [
          {
            "name": "createdAt",
            "visible": true,
            "preventSort": true
          },
          {
            "name": "updatedAt",
            "visible": true,
            "preventSort": false
          },
        ]
      }
    }
]
```

# Running as Express Middleware

Instead of starting Parse Dashboard with the CLI, you can also run it as an [express](https://github.com/expressjs/express) middleware.

```javascript
var express = require('express');
var ParseDashboard = require('parse-dashboard');

var dashboard = new ParseDashboard({
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "MyApp"
    }
  ]
});

var app = express();

// make the Parse Dashboard available at /dashboard
app.use('/dashboard', dashboard);

var httpServer = require('http').createServer(app);
httpServer.listen(4040);
```

If you want to run both [Parse Server](https://github.com/ParsePlatform/parse-server) and Parse Dashboard on the same server/port, you can run them both as express middleware:

```javascript
var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');

var api = new ParseServer({
	// Parse Server settings
});

var options = { allowInsecureHTTP: false };

var dashboard = new ParseDashboard({
	// Parse Dashboard settings
}, options);

var app = express();

// make the Parse Server available at /parse
app.use('/parse', api);

// make the Parse Dashboard available at /dashboard
app.use('/dashboard', dashboard);

var httpServer = require('http').createServer(app);
httpServer.listen(4040);
```

# Deploying Parse Dashboard

## Preparing for Deployment

Make sure the server URLs for your apps can be accessed by your browser. If you are deploying the dashboard, then `localhost` urls will not work.

## Security Considerations
In order to securely deploy the dashboard without leaking your apps master key, you will need to use HTTPS and Basic Authentication.

The deployed dashboard detects if you are using a secure connection. If you are deploying the dashboard behind a load balancer or front-facing proxy, then the app won't be able to detect that the connection is secure. In this case, you can start the dashboard with the `--trustProxy=1` option (or set the PARSE_DASHBOARD_TRUST_PROXY config var to 1) to rely on the X-Forwarded-* headers for the client's connection security.  This is useful for hosting on services like Heroku, where you can trust the provided proxy headers to correctly determine whether you're using HTTP or HTTPS.  You can also turn on this setting when using the dashboard as [express](https://github.com/expressjs/express) middleware:

```javascript
var trustProxy = true;
var dashboard = new ParseDashboard({
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "MyApp"
    }
  ],
  "trustProxy": 1
});
```



### Configuring Basic Authentication
You can configure your dashboard for Basic Authentication by adding usernames and passwords your `parse-dashboard-config.json` configuration file:

```json
{
  "apps": [{"...": "..."}],
  "users": [
    {
      "user":"user1",
      "pass":"pass"
    },
    {
      "user":"user2",
      "pass":"pass"
    }
  ],
  "useEncryptedPasswords": true | false
}
```

You can store the password in either `plain text` or `bcrypt` formats. To use the `bcrypt` format, you must set the config `useEncryptedPasswords` parameter to `true`.
You can encrypt the password using any online bcrypt tool e.g. [https://www.bcrypt-generator.com](https://www.bcrypt-generator.com).

### Separating App Access Based on User Identity
If you have configured your dashboard to manage multiple applications, you can restrict the management of apps based on user identity.

To do so, update your `parse-dashboard-config.json` configuration file to match the following format:

```json
{
  "apps": [{"...": "..."}],
  "users": [
     {
       "user":"user1",
       "pass":"pass1",
       "apps": [{"appId": "myAppId1"}, {"appId": "myAppId2"}]
     },
     {
       "user":"user2",
       "pass":"pass2",
       "apps": [{"appId": "myAppId1"}]
     }  ]
}
```
The effect of such a configuration is as follows:

When `user1` logs in, he/she will be able to manage `myAppId1` and `myAppId2` from the dashboard.

When *`user2`*  logs in, he/she will only be able to manage *`myAppId1`* from the dashboard.

## Use Read-Only masterKey

Starting parse-server 2.6.5, it is possible to provide a `readOnlyMasterKey` to parse-server to prevent mutations on objects from a client.
If you want to protect your dashboard with this feature, just use the `readOnlyMasterKey` instead of the `masterKey`. All write calls will fail.

### Making an app read-only for all users

Start your `parse-server` with

```json
{
"masterKey": "YOUR_MASTER_KEY_HERE",
"readOnlyMasterKey": "YOUR_READ_ONLY_MASTER_KEY",
}
```

Then in your dashboard configuration:

```javascript
var trustProxy = true;
var dashboard = new ParseDashboard({
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "myAppId",
      "masterKey": "YOUR_READ_ONLY_MASTER_KEY",
      "appName": "MyApp"
    }
  ],
  "trustProxy": 1
});
```

### Makings users read-only

Make sure you specify the `readOnlyMasterKey` for the apps that you want to use read-only feature in "apps" configuration.
You can mark a user as a read-only user:

```json
{
  "apps": [
    {
      "appId": "myAppId1",
      "masterKey": "myMasterKey1",
      "readOnlyMasterKey": "myReadOnlyMasterKey1",
      "serverURL": "myURL1",      
      "port": 4040,
      "production": true
    },
    {
      "appId": "myAppId2",
      "masterKey": "myMasterKey2",
      "readOnlyMasterKey": "myReadOnlyMasterKey2",
      "serverURL": "myURL2",      
      "port": 4041,
      "production": true
    }
  ],
  "users": [
    {
      "user":"user1",
      "pass":"pass1",
      "readOnly": true,
      "apps": [{"appId": "myAppId1"}, {"appId": "myAppId2"}]
    },
    {
      "user":"user2",
      "pass":"pass2",
      "apps": [{"appId": "myAppId1"}]
    }
  ]
}
```

This way `user1` will have a readOnly access to `myAppId1` and `myAppId2`

### Making user's apps readOnly

Make sure you specify the `readOnlyMasterKey` for the apps that you want to use read-only feature in "apps" configuration.
You can give read only access to a user on a per-app basis:

```json
{
  "apps": [
    {
      "appId": "myAppId1",
      "masterKey": "myMasterKey1",
      "readOnlyMasterKey": "myReadOnlyMasterKey1",
      "serverURL": "myURL",      
      "port": 4040,
      "production": true
    },
    {"...": "..."}
  ],
  "users": [
    {
      "user":"user",
      "pass":"pass",
      "apps": [{"appId": "myAppId", "readOnly": true}, {"appId": "myAppId2"}]
    }
  ]
}
```

With this configuration, user1 will have read only access to `myAppId1` and read/write access to `myAppId2`.

## Configuring Localized Push Notifications

With the latest version of the [dashboard](https://www.npmjs.com/package/parse-dashboard), it is possible to send localized messages for push notifications.
You can provide a list of locales or languages you want to support for your dashboard users.

```json
{
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "myAppId",
      "masterKey": "myMasterKey",
      "appName": "My Parse Server App",
      "iconName": "MyAppIcon.png",
      "supportedPushLocales": ["en", "ru", "fr"]
    }
  ],
  "iconsFolder": "icons"
}
```

## Run with Docker

The official docker image is published on [docker hub](https://hub.docker.com/r/parseplatform/parse-dashboard) 

Run the image with your ``config.json`` mounted as a volume

```
docker run -d -p 8080:4040 -v host/path/to/config.json:/src/Parse-Dashboard/parse-dashboard-config.json parseplatform/parse-dashboard --dev
```

You can also pass the appId, masterKey and serverURL as arguments:

```
docker run -d -p 4040:4040 parseplatform/parse-dashboard --dev --appId $APP_ID --masterKey $MASTER_KEY --serverURL $SERVER_URL
```

By default, the container will start the app at port 4040 inside the container. However, you can run custom command as well (see ``Deploying in production`` for custom setup).

In this example, we want to run the application in production mode at port 80 of the host machine.

```
docker run -d -p 80:8080 -v host/path/to/config.json:/src/Parse-Dashboard/parse-dashboard-config.json parse-dashboard --port 8080 --dev
```

If you are not familiar with Docker, ``--port 8080`` will be passed in as argument to the entrypoint to form the full command ``npm start -- --port 8080``. The application will start at port 8080 inside the container and port ``8080`` will be mounted to port ``80`` on your host machine.

# Contributing

We really want Parse to be yours, to see it grow and thrive in the open source community. Please see the [Contributing to Parse Dashboard guide](CONTRIBUTING.md).

-----

As of April 5, 2017, Parse, LLC has transferred this code to the parse-community organization, and will no longer be contributing to or distributing this code.

[license-svg]: https://img.shields.io/badge/license-BSD-lightgrey.svg
[license-link]: LICENSE
[open-collective-link]: https://opencollective.com/parse-server
