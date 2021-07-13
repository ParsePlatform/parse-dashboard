/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
const VERSION = 'v1'; // In case we ever need to invalidate these
const DEFAULT_WIDTH = 150;
const COLUMN_SORT = '__columnClassesSort'; // Used for storing classes sort field
const DEFAULT_COLUMN_SORT = '-createdAt'; // Default column sorting
let cache = {};

export function updatePreferences(prefs, appId, className) {
  try {
    localStorage.setItem(path(appId, className), JSON.stringify(prefs));
  } catch (e) {
    // Fails in Safari private browsing
  }
  cache[appId] = cache[appId] || {};
  cache[appId][className] = prefs;
}

export function getPreferences(appId, className) {
  if (cache[appId] && cache[appId][className]) {
    return cache[appId][className];
  }
  let entry;
  try {
    entry = localStorage.getItem(path(appId, className));
  } catch (e) {
    // Fails in Safari private browsing
    entry = null;
  }
  if (!entry) {
    return null;
  }
  try {
    let prefs = JSON.parse(entry);
    cache[appId] = cache[appId] || {};
    cache[appId][className] = prefs;
    return prefs;
  } catch (e) {
    return null;
  }
}

export function getColumnSort(sortBy, appId, className) {
  let cachedSort = getPreferences(appId, COLUMN_SORT) || [ { name: className, value: DEFAULT_COLUMN_SORT } ];
  let ordering = [].concat(cachedSort);
  let updated = false;
  let missing = true;
  let currentSort = sortBy ? sortBy : DEFAULT_COLUMN_SORT;
  for (let i = 0; i < ordering.length; i++) {
    if (ordering[i].name === className) {
      missing = false;
      if (ordering[i].value !== currentSort && sortBy) {
        updated = true;
        ordering[i].value = currentSort;
      } else {
        currentSort = ordering[i].value;
      }
    }
  }
  if(missing) {
    ordering.push({ name: className, value: currentSort });
  }
  if ((updated && sortBy) || missing) {
    updatePreferences(ordering, appId, COLUMN_SORT);
  }
  return currentSort;
}

export function getOrder(cols, appId, className, defaultPrefs) {

  let prefs = getPreferences(appId, className) || [ { name: 'objectId', width: DEFAULT_WIDTH, visible: true } ];
  if (defaultPrefs) {
    prefs = defaultPrefs;
  }
  let order = [].concat(prefs);
  let seen = {};
  for (let i = 0; i < order.length; i++) {
    seen[order[i].name] = true;
  }
  let requested = {};
  let updated = false;
  for (let name in cols) {
    requested[name] = true;
    if (!seen[name]) {
      order.push({ name: name, width: DEFAULT_WIDTH, visible: !defaultPrefs, required: cols[name]['required'] });
      seen[name] = true;
      updated = true;
    }
  }
  let filtered = [];
  for (let i = 0; i < order.length; i++) {
    const { name, visible, required } = order[i];

    // If "visible" attribute is not defined, sets to true
    // and updates the cached preferences.
    if (typeof visible === 'undefined') {
      order[i].visible = true;
      updated = true;
    }
    // If "required" attribute is not defined, set it to false
    if (typeof required === 'undefined') {
      order[i].required = false;
    }
    if (requested[name]) {
      filtered.push(order[i]);
    } else {
      updated = true;
    }
  }
  if (updated) {
    updatePreferences(filtered, appId, className);
  }
  return filtered;
}

function path(appId, className) {
  return `ParseDashboard:${VERSION}:${appId}:${className}`;
}
