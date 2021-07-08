/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import CSRFInput from 'components/CSRFInput/CSRFInput.react';
import Icon               from 'components/Icon/Icon.react';
import React              from 'react';
import styles             from 'components/LoginForm/LoginForm.scss';
import { verticalCenter } from 'stylesheets/base.scss';

// Class-style component, because we need refs
export default class LoginForm extends React.Component {
  render() {
    const customBrandIcon = window.CUSTOM_BRAND_ICON;
    const customBrandTitle = window.CUSTOM_BRAND_TITLE;
    return (
      <div className={styles.login} style={{ marginTop: this.props.marginTop || '-220px' }}>
        {!customBrandIcon && <Icon width={80} height={80} name='infinity' fill='#093A59' />}
        {customBrandIcon && <img src={'appicons/' + customBrandIcon} width={80} height={80} alt={customBrandTitle || 'Brand Logo'} />}
        <form method='post' ref='form' action={this.props.endpoint} className={styles.form}>
          <CSRFInput />
          <div className={styles.header}>{this.props.header}</div>
          {this.props.children}
          <div className={styles.footer}>
            <div className={verticalCenter} style={{ width: '100%' }}>
              {this.props.footer}
            </div>
          </div>
          <input
            type='submit'
            disabled={!!this.props.disableSubmit}
            onClick={() => {
              if (this.props.disableSubmit) {
                return;
              }
              this.refs.form.submit()
            }}
            className={styles.submit}
            value={this.props.action} />
        </form>
      </div>
    );
  }
}
