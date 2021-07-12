/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Parse from 'parse';

// Given a className and a set of filters, generate a Parse.Query
export default function queryFromFilters(className, filters) {
  let query;
  if (typeof className === 'string') {
    query = new Parse.Query(className);
  } else if (typeof className === 'object' && className instanceof Parse.Relation) {
    query = className.query();
  }
  filters.forEach((filter) => {
    addConstraint(query, filter);
  });
  return query;
}

function addQueryConstraintFromObject(query, filter, constraintType) {
  let compareTo = JSON.parse(filter.get('compareTo'));
  for (let key of Object.keys(compareTo)) {
    query[constraintType](filter.get('field')+'.'+key, compareTo[key]);
  }
}

function addConstraint(query, filter) {
  switch (filter.get('constraint')) {
    case 'exists':
      query.exists(filter.get('field'));
      break;
    case 'dne':
      query.doesNotExist(filter.get('field'));
      break;
    case 'eq':
      query.equalTo(filter.get('field'), filter.get('compareTo'));
      break;
    case 'neq':
      query.notEqualTo(filter.get('field'), filter.get('compareTo'));
      break;
    case 'lt':
      query.lessThan(filter.get('field'), filter.get('compareTo'));
      break;
    case 'lte':
      query.lessThanOrEqualTo(filter.get('field'), filter.get('compareTo'));
      break;
    case 'gt':
      query.greaterThan(filter.get('field'), filter.get('compareTo'));
      break;
    case 'gte':
      query.greaterThanOrEqualTo(filter.get('field'), filter.get('compareTo'));
      break;
    case 'starts':
      query.startsWith(filter.get('field'), filter.get('compareTo'));
      break;
    case 'ends':
      query.endsWith(filter.get('field'), filter.get('compareTo'));
      break;
    case 'before':
      query.lessThan(filter.get('field'), filter.get('compareTo'));
      break;
    case 'after':
      query.greaterThan(filter.get('field'), filter.get('compareTo'));
      break;
    case 'containsString':
    case 'containsNumber':
      query.equalTo(filter.get('field'), filter.get('compareTo'));
      break;
    case 'doesNotContainString':
    case 'doesNotContainNumber':
      query.notEqualTo(filter.get('field'), filter.get('compareTo'));
      break;
    case 'containedIn':
      query.containedIn(filter.get('field'), filter.get('array'));
      break;
    case 'stringContainsString':
      query.matches(filter.get('field'), filter.get('compareTo'), 'i');
      break;
    case 'keyExists':
      query.exists(filter.get('field') + '.' + filter.get('compareTo'));
      break;
    case 'keyDne':
      query.doesNotExist(filter.get('field') + '.' + filter.get('compareTo'));
      break;
    case 'keyEq':
      addQueryConstraintFromObject(query, filter, 'equalTo');
      break;
    case 'keyNeq':
      addQueryConstraintFromObject(query, filter, 'notEqualTo');
      break;
    case 'keyGt':
      addQueryConstraintFromObject(query, filter, 'greaterThan');
      break;
    case 'keyGte':
      addQueryConstraintFromObject(query, filter, 'greaterThanOrEqualTo');
      break;
    case 'keyLt':
      addQueryConstraintFromObject(query, filter, 'lessThan');
      break;
    case 'keyLte':
      addQueryConstraintFromObject(query, filter, 'lessThanOrEqualTo');
      break;
    case 'dneOrNull':
      query.equalTo(filter.get('field'), null);
      break;
  }
  return query;
}
