/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React  from 'react';
import styles from 'components/BrowserMenu/BrowserMenu.scss';

let MenuItem = ({ text, disabled, active, greenActive, onClick }) => {
  let classes = [styles.item];
  if (disabled) {
    classes.push(styles.disabled);
  }
  if (active) {
    classes.push(styles.active);
  }
  if (greenActive) {
    classes.push(styles.greenActive);
  }
  return <div className={classes.join(' ')} onClick={disabled ? undefined : onClick}>{text}</div>;
};

export default MenuItem;
