/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React      from 'react';
import { escape } from 'lib/StringEscaping';
import styles     from 'components/FileInput/FileInput.scss';

export default class FileInput extends React.Component {
  handleChange(e) {
    let file = e.target.files[0];
    this.props.onChange(file);
  }

  renderLabel() {
    if (!this.props.value) {
      return null;
    }
    if (typeof this.props.value === 'string') {
      return <span className={styles.label}>{escape(this.props.value)}</span>;
    }
    if (this.props.value.name && !this.props.value.url) {
      return <span className={styles.label}>{escape(this.props.value.name)}</span>;
    }
    if (this.props.value.name && this.props.value.url) {
      return (
        <a
          href={this.props.value.url}
          target='_blank'
          className={styles.label}>
          {escape(this.props.value.name)}
        </a>
      );
    }
  }

  render() {
    let inputProps = {
      type: 'file',
      value: '',
      disabled: this.props.disabled,
      onChange: this.handleChange.bind(this),
    };
    if (this.props.accept) {
      inputProps.accept = this.props.accept;
    }
    let label = this.renderLabel();
    let buttonStyles = [styles.button];
    if (this.props.disabled || this.props.uploading) {
      buttonStyles.push(styles.disabled);
    }
    if (label) {
      buttonStyles.push(styles.withLabel)
    }

    return (
      <div className={styles.input}>
        <div className={buttonStyles.join(' ')}>
          {this.props.uploading ? (
            <div className={styles.spinner}></div>
          ) : label ? (
            <span>Change file</span>
          ) : (
            <span>Upload a file</span>
          )}
          <input {...inputProps} />
        </div>
        {label}
      </div>
    );
  }
}
