/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React  from 'react';
import styles from 'components/Pill/Pill.scss';
import Icon from "components/Icon/Icon.react";

//TODO: refactor, may want to move onClick outside or need to make onClick able to handle link/button a11y
let Pill = ({ value, onClick, fileDownloadLink, followClick = false }) => (
  <span
    className={[
      styles.pill,
      !followClick && onClick ? styles.action : void 0
    ].join(" ")}
    onClick={!followClick && onClick ? onClick : null}
  >
    <span className={!followClick && fileDownloadLink ? styles.content : ''}>{value}</span>
    {followClick && (
      <a onClick={onClick}>
        <Icon name="right-outline" width={20} height={20} fill="#1669a1" />
      </a>
    )}
    {!followClick && fileDownloadLink && (
      <a href={fileDownloadLink} target="_blank">
        <Icon name="right-outline" width={20} height={20} fill="#1669a1" />
      </a>
    )}
  </span>
);

export default Pill;
