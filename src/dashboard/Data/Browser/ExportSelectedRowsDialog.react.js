/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Modal     from 'components/Modal/Modal.react';
import React     from 'react';

export default class ExportSelectedRowsDialog extends React.Component {
  constructor() {
    super();

    this.state = {
      confirmation: ''
    };
  }

  valid() {
    return true;
  }

  render() {
    let selectionLength = Object.keys(this.props.selection).length;
    return (
      <Modal
        type={Modal.Types.INFO}
        icon='warn-outline'
        title={this.props.selection['*'] ? 'Export all rows?' : (selectionLength === 1 ? 'Export this row?' : `Export ${selectionLength} rows?`)}
        subtitle={this.props.selection['*'] ? 'INFO: Export to CSV has a limit of 10,000 rows.' : ''}
        disabled={!this.valid()}
        confirmText={'Yes export'}
        cancelText={'Never mind, don\u2019t.'}
        onCancel={this.props.onCancel}
        onConfirm={this.props.onConfirm}>
        {}
      </Modal>
    );
  }
}
