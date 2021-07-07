/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import hasAncestor from 'lib/hasAncestor';
import Parse from 'parse';
import React from 'react';
import styles from 'components/FileEditor/FileEditor.scss';

export default class FileEditor extends React.Component {
  constructor(props) {
    super();

    this.state = {
      value: props.value
    };

    this.checkExternalClick = this.checkExternalClick.bind(this);
    this.handleKey = this.handleKey.bind(this);
    this.removeFile = this.removeFile.bind(this);
  }

  componentDidMount() {
    document.body.addEventListener('click', this.checkExternalClick);
    document.body.addEventListener('keypress', this.handleKey);
    let fileInputElement = document.getElementById('fileInput');
    if (fileInputElement) {
      fileInputElement.click();
    }
  }
  
  componentWillUnmount() {
    document.body.removeEventListener('click', this.checkExternalClick);
    document.body.removeEventListener('keypress', this.handleKey);
  }

  checkExternalClick(e) {
    const { onCancel } = this.props;
    if (!hasAncestor(e.target, this.refs.input) && onCancel) {
      onCancel();
    }
  }

  handleKey(e) {
    const { onCancel } = this.props;
    if (e.keyCode === 13 && onCancel) {
      onCancel();
    }
  }

  getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  removeFile() {
    this.refs.fileInput.value = '';
    this.props.onCommit(undefined);
  }

  async handleChange(e) {
    let file = e.target.files[0];
    if (file) {
      let base64 = await this.getBase64(file);
      this.props.onCommit(new Parse.File(file.name, { base64 }));
    }
  }

  render() {
    const file = this.props.value;
    return (
      <div ref='input' style={{ minWidth: this.props.width, display: 'none' }} className={styles.editor}>
        <a className={styles.upload}>
          <input ref='fileInput' id='fileInput' type='file' onChange={this.handleChange.bind(this)} />
          <span>{file ? 'Replace file' : 'Upload file'}</span>
        </a>
      </div>
    );
  }
}
