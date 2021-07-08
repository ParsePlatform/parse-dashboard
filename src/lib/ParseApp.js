/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import * as AJAX      from 'lib/AJAX';
import encodeFormData from 'lib/encodeFormData';
import Parse          from 'parse';

function setEnablePushSource(setting, enable) {
  let path = `/apps/${this.slug}/update_push_notifications`;
  let attr = `parse_app[${setting}]`;
  let body = {};
  body[attr] = enable ? 'true' : 'false';
  let promise = AJAX.put(path, body);
  promise.then(() => {
    this.settings.fields.fields[setting] = enable;
  });
  return promise;
}

export default class ParseApp {
  constructor({
    appName,
    created_at,
    clientKey,
    appId,
    appNameForURL,
    dashboardURL,
    javascriptKey,
    masterKey,
    restKey,
    windowsKey,
    webhookKey,
    apiKey,
    serverURL,
    serverInfo,
    production,
    iconName,
    primaryBackgroundColor,
    secondaryBackgroundColor,
    supportedPushLocales,
    preventSchemaEdits,
    graphQLServerURL,
    columnPreference
  }) {
    this.name = appName;
    this.createdAt = created_at ? new Date(created_at) : new Date();
    this.applicationId = appId;
    this.slug = appNameForURL || appName;
    if (!this.slug && dashboardURL) {
      let pieces = dashboardURL.split('/');
      this.slug = pieces[pieces.length - 1];
    }
    this.clientKey = clientKey;
    this.javascriptKey = javascriptKey;
    this.masterKey = masterKey;
    this.restKey = restKey;
    this.windowsKey = windowsKey;
    this.webhookKey = webhookKey;
    this.fileKey =  apiKey;
    this.production = production;
    this.serverURL = serverURL;
    this.serverInfo = serverInfo;
    this.icon = iconName;
    this.primaryBackgroundColor=primaryBackgroundColor;
    this.secondaryBackgroundColor=secondaryBackgroundColor;
    this.supportedPushLocales = supportedPushLocales ? supportedPushLocales : [];
    this.preventSchemaEdits = preventSchemaEdits || false;
    this.graphQLServerURL = graphQLServerURL;
    this.columnPreference = columnPreference;

    if(!supportedPushLocales) {
      console.warn('Missing push locales for \'' + appName + '\', see this link for details on setting localizations up. https://github.com/parse-community/parse-dashboard#configuring-localized-push-notifications');
    }

    this.settings = {
      fields: {},
      lastFetched: new Date(0)
    };

    this.latestRelease = {
      release: null,
      lastFetched: new Date(0)
    };

    this.jobStatus = {
      status: null,
      lastFetched: new Date(0)
    };

    this.classCounts = {
      counts: {},
      lastFetched: {},
    }

    this.hasCheckedForMigraton = false;
  }

  setParseKeys() {
    Parse.serverURL = this.serverURL;
    Parse._initialize(this.applicationId, this.javascriptKey, this.masterKey);
  }

  apiRequest(method, path, params, options) {
    this.setParseKeys();
    return Parse._request(method, path, params, options);
  }

  /**
   * Fetches scriptlogs from api.parse.com
   * lines - maximum number of lines to fetch
   * since - only fetch lines since this Date
   */
  getLogs(level, since) {
    let path = 'scriptlog?level=' + encodeURIComponent(level.toLowerCase()) + '&n=100' + (since?'&startDate=' + encodeURIComponent(since.getTime()):'');
    return this.apiRequest('GET', path, {}, { useMasterKey: true });
  }

  /**
   * Saves source of a Cloud Code hosted file from api.parse.com
   * fileName - the name of the file to be fetched
   * data - the text to save to the cloud file
   */
  saveSource(fileName,data) {
    return this.apiRequest('POST', `scripts/${fileName}`, {data}, { useMasterKey: true });
  }

  /**
   * Fetches source of a Cloud Code hosted file from api.parse.com
   * fileName - the name of the file to be fetched
   */
  getSource(fileName) {
    return this.getLatestRelease().then((release) => {
      if (release.files === null) {
        // No release yet
        return Promise.resolve(null);
      }
      return this.apiRequest('GET', `scripts/${fileName}`, {}, { useMasterKey: true });
    }).then((source) => {
      if (this.latestRelease.files) {
        this.latestRelease.files[fileName].source = source;
      }
      return Promise.resolve(source);
    });
  }

  getLatestRelease() {
    // Cache it for a minute
    if (new Date() - this.latestRelease.lastFetched < 60000) {
      return Promise.resolve(this.latestRelease);
    }
    return this.apiRequest(
      'GET',
      'releases/latest',
      {},
      { useMasterKey: true }
    ).then((release) => {
      this.latestRelease.lastFetched = new Date();
      this.latestRelease.files = null;

      if (release.length === 0) {
        this.latestRelease.release = null;
      } else {
        let latestRelease = release[0];

        this.latestRelease.release = {
          version: latestRelease.version,
          parseVersion: latestRelease.parseVersion,
          deployedAt: new Date(latestRelease.timestamp)
        };

        let checksums = JSON.parse(latestRelease.checksums);
        let versions = JSON.parse(latestRelease.userFiles);
        this.latestRelease.files = {};

        // The scripts can be in `/` or in `/cloud`. Let's check for both.
        if (checksums.cloud) {
          checksums = checksums.cloud;
        }
        if (versions.cloud) {
          versions = versions.cloud;
        }
        for (let c in checksums) {
          this.latestRelease.files[c] = {
            checksum: checksums[c],
            version: versions[c],
            source: null
          };
        }
      }

      return Promise.resolve(this.latestRelease);
    });
  }

  getClassCount(className) {
    this.setParseKeys();
    if (this.classCounts.counts[className] !== undefined) {
      // Cache it for a minute
      if (new Date() - this.classCounts.lastFetched[className] < 60000) {
        return Promise.resolve(this.classCounts.counts[className]);
      }
    }
    let p = new Parse.Query(className).count({ useMasterKey: true });
    p.then(count => {
      this.classCounts.counts[className] = count;
      this.classCounts.lastFetched[className] = new Date();
    })
    return p;
  }

  getRelationCount(relation) {
    this.setParseKeys();
    let p = relation.query().count({ useMasterKey: true });
    return p;
  }

  getAnalyticsRetention(time) {
    time = Math.round(time.getTime() / 1000);
    return AJAX.abortableGet('/apps/' + this.slug + '/analytics_retention?at=' + time);
  }

  getAnalyticsOverview(time) {
    time = Math.round(time.getTime() / 1000);
    let audiencePromises = [
      'daily_users',
      'weekly_users',
      'monthly_users',
      'total_users',
      'daily_installations',
      'weekly_installations',
      'monthly_installations',
      'total_installations'
    ].map((activity) => {
      let { xhr, promise } = AJAX.abortableGet('/apps/' + this.slug + '/analytics_content_audience?at=' + time + '&audienceType=' + activity);
      promise = promise.then((result) => (
        result.total === undefined ? result.content : result.total
      ));
      return { xhr, promise }
    });

    let billingPromises = [
      'billing_file_storage',
      'billing_database_storage',
      'billing_data_transfer'
    ].map((billing) => (
      AJAX.abortableGet('/apps/' + this.slug + '/' + billing)
    ));

    let allPromises = audiencePromises.concat(billingPromises);

    return {
      'dailyActiveUsers': allPromises[0],
      'weeklyActiveUsers': allPromises[1],
      'monthlyActiveUsers': allPromises[2],
      'totalUsers': allPromises[3],
      'dailyActiveInstallations': allPromises[4],
      'weeklyActiveInstallations': allPromises[5],
      'monthlyActiveInstallations': allPromises[6],
      'totalInstallations': allPromises[7],
      'billingFileStorage': allPromises[8],
      'billingDatabasetorage': allPromises[9],
      'billingDataTransfer': allPromises[10]
    };
  }

  getAnalyticsTimeSeries(query) {
    let path = '/apps/' + this.slug + '/analytics?' + encodeFormData(null, query);
    let { promise, xhr } = AJAX.abortableGet(path);
    promise = promise.then(({ requested_data }) => requested_data);
    return { promise, xhr };
  }

  getAnalyticsSlowQueries(className, os, version, from, to) {
    let path = '/apps/' + this.slug + '/slow_queries?' + encodeFormData(null, {
      className: className || '',
      os: os || '',
      version: version || '',
      from: from.getTime() / 1000,
      to: to.getTime() / 1000
    });
    let { promise, xhr } = AJAX.abortableGet(path);
    promise = promise.then(({ result }) => result);

    return { promise, xhr };
  }

  getAppleCerts() {
    let path = '/apps/' + this.slug + '/apple_certificates';
    return AJAX.get(path).then(({ certs }) => certs);
  }

  uploadAppleCert(file) {
    let path = '/apps/' + this.slug + '/dashboard_ajax/push_certificate';
    let data = new FormData();
    data.append('new_apple_certificate', file);
    return AJAX.post(path, data).then(({ cert }) => cert);
  }

  deleteAppleCert(id) {
    let path = '/apps/' + this.slug + '/apple_certificates/' + id;
    return AJAX.del(path);
  }

  uploadSSLPublicCertificate(file) {
    let path = '/apps/' + this.slug + '/update_hosting_certificates';
    let data= new FormData();
    data.append('new_hosting_certificate[certificate_data]', file);
    return AJAX.put(path, data);
  }

  uploadSSLPrivateKey(file) {
    let path = '/apps/' + this.slug + '/update_hosting_certificates';
    let data= new FormData();
    data.append('new_hosting_certificate[key_data]', file);
    return AJAX.put(path, data);
  }

  saveSettingsFields(fields) {
    let path = '/apps/' + this.slug;
    let appFields = {};
    for (let f in fields) {
      appFields['parse_app[' + f + ']'] = fields[f];
    }
    let promise = AJAX.put(path, appFields);
    promise.then(({ successes }) => {
      for (let f in fields) {
        this.settings.fields[f] = successes[f];
      }
    });
    return promise;
  }

  fetchSettingsFields() {
    // Cache it for a minute
    if (new Date() - this.settings.lastFetched < 60000) {
      return Promise.resolve(this.settings.fields);
    }
    let path = '/apps/' + this.slug + '/dashboard_ajax/settings';
    return AJAX.get(path).then((fields) => {
      for (let f in fields) {
        this.settings.fields[f] = fields[f];
        this.settings.lastFetched = new Date();
      }
      return Promise.resolve(fields);
    });
  }

  cleanUpFiles() {
    let path = '/apps/' + this.slug + '/cleanup_files';
    return AJAX.put(path);
  }

  exportData() {
    let path = '/apps/' + this.slug + '/export_data';
    return AJAX.put(path);
  }

  resetMasterKey(password) {
    let path = '/apps/' + this.slug + '/reset_master_key';
    return AJAX.post(
      path,
      { password_confirm_reset_master_key: password }
    ).then(({ new_key }) => {
      this.masterKey = new_key;
      return Promise.resolve();
    });
  }

  clearCollection(className) {
    if (this.serverInfo.parseServerVersion == 'Parse.com') {
      let path = `/apps/${this.slug}/collections/${className}/clear`;
      return AJAX.del(path);
    } else {
      let path = `purge/${className}`;
      return this.apiRequest('DELETE', path, {}, { useMasterKey: true });
    }
  }

  validateCollaborator(email) {
    let path = '/apps/' + this.slug + '/collaborations/validate?email=' + encodeURIComponent(email);
    return AJAX.get(path);
  }

  fetchPushSubscriberCount(audienceId, query) {
    let promise;
    if (audienceId === 'everyone') {
      query = {};
    }
    if (!query) {
      promise = new Parse.Query('_Audience').get(audienceId, { useMasterKey: true }).then(function(audience) {
        return Parse.Query.fromJSON('_Installation', { where: audience.get('query') }).count({ useMasterKey: true })
      });
    } else {
      promise = Parse.Query.fromJSON('_Installation', { where: query }).count({ useMasterKey: true })
    }
    return { xhr: undefined, promise: promise.then(function (count) {
      return { count: count };
    }) };
  }

  fetchPushNotifications(type, page, limit) {
    let query = new Parse.Query('_PushStatus');
    if (type != 'all') {
      query.equalTo('source', type || 'rest');
    }
    query.skip(page*limit);
    query.limit(limit);
    query.descending('createdAt');
    return query.find({ useMasterKey: true });
  }

  fetchPushAudienceSizeSuggestion() {
    let path = '/apps/' + this.slug + '/push_notifications/audience_size_suggestion';
    return AJAX.get(path);
  }

  fetchPushDetails(objectId) {
    let query = new Parse.Query('_PushStatus');
    query.equalTo('objectId', objectId);
    return query.first({ useMasterKey: true });
  }

  isLocalizationAvailable() {
    return !!this.serverInfo.features.push.localization;
  }

  fetchPushLocales() {
    return this.supportedPushLocales;
  }

  fetchPushLocaleDeviceCount(audienceId, where, locales) {
    let path = '/apps/' + this.slug + '/push_subscriber_translation_count';
    let urlsSeparator = '?';
    path += `?where=${encodeURI(JSON.stringify(where || {}))}`;
    path += `&locales=${encodeURI(JSON.stringify(locales))}`
    urlsSeparator = '&';
    return AJAX.abortableGet(audienceId ? `${path}${urlsSeparator}audienceId=${audienceId}` : path);
  }

  fetchAvailableDevices() {
    let path = '/apps/' + this.slug + '/dashboard_ajax/available_devices';
    return AJAX.get(path);
  }

  removeCollaboratorById(id) {
    let path = '/apps/' + this.slug + '/collaborations/' + id.toString();
    let promise = AJAX.del(path)
    promise.then(() => {
      //TODO: this currently works because everything that uses collaborators
      // happens to re-render after this call anyway, but really the collaborators
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.collaborators = this.settings.fields.fields.collaborators.filter(c => c.id != id);
    });
    return promise;
  }

  addCollaborator(email) {
    let path = '/apps/' + this.slug + '/collaborations';
    let promise = AJAX.post(path, {'collaboration[email]': email});
    promise.then(({ data }) => {
      //TODO: this currently works because everything that uses collaborators
      // happens to re-render after this call anyway, but really the collaborators
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.collaborators.unshift(data);
    });
    return promise;
  }

  setRequestLimit(limit) {
    let path = '/plans/' + this.slug + '?new_limit=' + limit.toString();
    let promise = AJAX.put(path);
    promise.then(() => {
      this.settings.fields.fields.pricing_plan.request_limit = limit;
    });
    return promise;
  }

  setAppName(name) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[name]': name});
    promise.then(() => {
      this.name = name;
    });
    return promise;
  }

  setAppStoreURL(type, url) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {['parse_app[parse_app_metadata][url][' + type + ']']: url});
    promise.then(() => {
      this.settings.fields.fields.urls.unshift({platform: type, url: url});
    });
    return promise;
  }

  setInProduction(inProduction) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[parse_app_metadata][production]': inProduction ? 'true' : 'false'});
    promise.then(() => {
      this.production = inProduction;
    });
    return promise;
  }

  launchExperiment(objectId, formData) {
    let path = `/apps/${this.slug}/push_notifications/${objectId}/launch_experiment`;
    return AJAX.post(path, formData);
  }

  exportClass(className, where) {
    if (!where) {
      where = {};
    }
    let path = '/apps/' + this.slug + '/export_data';
    return AJAX.put(path, { name: className, where: where });
  }

  getExportProgress() {
    let path = '/apps/' + this.slug + '/export_progress';
    return AJAX.get(path);
  }

  getAvailableJobs() {
    let path = 'cloud_code/jobs/data';
    return this.apiRequest('GET', path, {}, { useMasterKey: true });
  }

  getJobStatus() {
    // Cache it for a 30s
    if (new Date() - this.jobStatus.lastFetched < 30000) {
      return Promise.resolve(this.jobStatus.status);
    }
    let query = new Parse.Query('_JobStatus');
    query.descending('createdAt');
    return query.find({ useMasterKey: true }).then((status) => {
      status = status.map((jobStatus) => {
        return jobStatus.toJSON();
      });
      this.jobStatus = {
        status: status || null,
        lastFetched: new Date()
      };
      return status;
    });
  }

  runJob(job) {
    return Parse._request(
      'POST',
      'jobs',
      {
        description: 'Executing from job schedule web console.',
        input: JSON.parse(job.params || '{}'),
        jobName: job.jobName,
        when: 0
      },
      { useMasterKey: true }
    );
  }

  getMigrations() {
    let path = '/apps/' + this.slug + '/migrations';
    let obj = AJAX.abortableGet(path);
    this.hasCheckedForMigraton = true
    obj.promise.then(({ migration }) => {
      this.migration = migration;
    }).catch(() => {}); // swallow errors
    return obj;
  }

  beginMigration(connectionString) {
    this.hasCheckedForMigraton = false;
    let path = '/apps/' + this.slug + '/migrations';
    return AJAX.post(path, {connection_string: connectionString});
  }

  changeConnectionString(newConnectionString) {
    let path = '/apps/' + this.slug + '/change_connection_string';
    let promise = AJAX.post(path, {connection_string: newConnectionString});
    promise.then(() => {
      this.settings.fields.fields.opendb_connection_string = newConnectionString;
    });
    return promise;
  }

  stopMigration() {
    //We will need to pass the real ID here if we decide to have migrations deletable by id. For now, from the users point of view, there is only one migration per app.
    let path = '/apps/' + this.slug + '/migrations/0';
    return AJAX.del(path);
  }

  commitMigration() {
    //Migration IDs are not to be exposed, so pass 0 as ID and let rails fetch the correct ID
    let path = '/apps/' + this.slug + '/migrations/0/commit';
    //No need to update anything, UI will autorefresh once request goes through and mowgli enters FINISH/DONE state
    return AJAX.post(path);
  }

  setRequireRevocableSessions(require) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[require_revocable_session]': require ? 'true' : 'false'});
    promise.then(() => {
      //TODO: this currently works because everything that uses this
      // happens to re-render after this call anyway, but really this
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.require_revocable_session = require;
    });
    return promise;
  }

  setExpireInactiveSessions(require) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[expire_revocable_session]': require ? 'true' : 'false'});
    promise.then(() => {
      //TODO: this currently works because everything that uses this
      // happens to re-render after this call anyway, but really this
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.expire_revocable_session = require;
    });
    return promise;
  }

  setRevokeSessionOnPasswordChange(require) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[revoke_on_password_reset]': require ? 'true' : 'false'});
    promise.then(() => {
      //TODO: this currently works because everything that uses this
      // happens to re-render after this call anyway, but really this
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.revoke_on_password_reset = require;
    });
    return promise;
  }

  setEnableNewMethodsByDefault(require) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[auth_options_attributes][_enable_by_default_as_bool]': require ? 'true' : 'false'});
    promise.then(() => {
      //TODO: this currently works because everything that uses this
      // happens to re-render after this call anyway, but really this
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.auth_options_attributes._enable_by_default = require;
    });
    return promise;
  }

  setAllowUsernameAndPassword(require) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[auth_options_attributes][username_attributes][enabled_as_bool]': require ? 'true' : 'false'});
    promise.then(() => {
      //TODO: this currently works because everything that uses this
      // happens to re-render after this call anyway, but really this
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.auth_options_attributes.username.enabled = require;
    });
    return promise;
  }

  setAllowAnonymousUsers(require) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[auth_options_attributes][anonymous_attributes][enabled_as_bool]': require ? 'true' : 'false'});
    promise.then(() => {
      //TODO: this currently works because everything that uses this
      // happens to re-render after this call anyway, but really this
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.auth_options_attributes.anonymous.enabled = require;
    });
    return promise;
  }

  setAllowCustomAuthentication(require) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {'parse_app[auth_options_attributes][custom_attributes][enabled_as_bool]': require ? 'true' : 'false'});
    promise.then(() => {
      //TODO: this currently works because everything that uses this
      // happens to re-render after this call anyway, but really this
      // should be updated properly in a store or AppsManager or something
      this.settings.fields.fields.auth_options_attributes.custom.enabled = require;
    });
    return promise;
  }

  setConnectedFacebookApps(idList, secretList) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {
      'parse_app[auth_options_attributes][facebook_attributes][app_ids_as_list]': idList.join(','),
      'parse_app[auth_options_attributes][facebook_attributes][app_secrets_as_list]': secretList.join(','),
    });
    promise.then(() => {
      this.settings.fields.fields.auth_options_attributes.facebook.app_ids = idList;
      this.settings.fields.fields.auth_options_attributes.facebook.app_secrets = secretList;
    });
    return promise;
  }

  addConnectedFacebookApp(newId, newSecret) {
    let allIds = (this.settings.fields.fields.auth_options_attributes.facebook.app_ids || []).concat(newId);
    let allSecrets = (this.settings.fields.fields.auth_options_attributes.facebook.app_secrets || []).concat(newSecret);
    return this.setConnectedFacebookApps(allIds, allSecrets);
  }

  setAllowFacebookAuth(enable) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {
      'parse_app[auth_options_attributes][facebook_attributes][enabled_as_bool]': enable ? 'true' : 'false',
    });
    promise.then(() => {
      this.settings.fields.fields.auth_options_attributes.facebook.enabled = !!enable;
    });
    return promise;
  }

  setConnectedTwitterApps(consumerKeyList) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {
      'parse_app[auth_options_attributes][twitter_attributes][consumer_keys_as_list]': consumerKeyList.join(','),
    });
    promise.then(() => {
      this.settings.fields.fields.auth_options_attributes.twitter.consumer_keys = consumerKeyList;
    });
    return promise;
  }

  addConnectedTwitterApp(newConsumerKey) {
    let allKeys = (this.settings.fields.fields.auth_options_attributes.twitter.consumer_keys || []).concat(newConsumerKey);
    return this.setConnectedTwitterApps(allKeys);
  }

  setAllowTwitterAuth(allow) {
    let path = '/apps/' + this.slug;
    let promise = AJAX.put(path, {
      'parse_app[auth_options_attributes][twitter_attributes][enabled_as_bool]': allow ? 'true' : 'false',
    });
    promise.then(() => {
      this.settings.fields.fields.auth_options_attributes.twitter.enabled = !!allow;
    });
    return promise;
  }

  setEnableClientPush(enable) {
    return setEnablePushSource.call(this, 'client_push_enabled', enable);
  }

  setEnableRestPush(enable) {
    return setEnablePushSource.call(this, 'rest_push_enabled', enable);
  }

  addGCMCredentials(sender_id, api_key) {
    let path = '/apps/' + this.slug + '/update_push_notifications'
    let promise = AJAX.post(path, {
      gcm_sender_id: sender_id,
      gcm_api_key: api_key
    });
    promise.then(() => {
      this.settings.fields.fields.gcm_credentials.push({ sender_id, api_key });
    });
    return promise;
  }

  deleteGCMPushCredentials(GCMSenderID) {
    let path = '/apps/' + this.slug + '/delete_gcm_push_credential?gcm_sender_id='+GCMSenderID;
    let promise = AJAX.get(path);
    promise.then(() => {
      this.settings.fields.fields.gcm_credentials = this.settings.fields.fields.gcm_credentials.filter(cred =>
        cred.sender_id != GCMSenderID
      );
    });
    return promise;
  }
}
