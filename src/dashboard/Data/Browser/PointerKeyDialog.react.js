/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Button             from 'components/Button/Button.react';
import Dropdown           from 'components/Dropdown/Dropdown.react';
import Field              from 'components/Field/Field.react';
import { footer }         from 'components/Modal/Modal.scss';
import Label              from 'components/Label/Label.react';
import Modal              from 'components/Modal/Modal.react';
import Option             from 'components/Dropdown/Option.react';
import React              from 'react';

export default class PointerKeyDialog extends React.Component {
  constructor() {
    super();
    this.state = {
      name: null
    };
  }

  async componentDidMount() {
    const defaultPointerKey = await localStorage.getItem(this.props.className);
    this.setState({ name: defaultPointerKey });
  }

  render() {
    let content = null;
    let hasColumns = this.props.currentColumns.length > 0;
    if (hasColumns) {
      content = (
        <Field
          label={
            <Label
              text='PointerKey' />
            }
          input={
            <Dropdown
              placeHolder='Select a column'
              value={this.state.name}
              onChange={(name) => this.setState({ name: name })}>
              {this.props.currentColumns.map((t) => <Option key={t} value={t}>{t}</Option>)}
            </Dropdown>
          } />
      )
    }
    return (
      <Modal
        type={Modal.Types.INFO}
        title={'Edit pointer key for this class'}
        subtitle={hasColumns ? 'The column will be used inplace of pointer column value for class:'+this.props.className : 'There are no columns on this class that can be set a pointer value.'}
        confirmText='Update pointer value'
        cancelText={'Never mind, don\u2019t.'}
        onCancel={this.props.onCancel}
        disabled={!this.state.name}
        onConfirm={() => {
          this.props.onConfirm(this.state.name);
        }}
        customFooter={hasColumns ? null :
          <div className={footer}>
            <Button value='Okay, go back.' onClick={this.props.onCancel} />
          </div>
        }>
        {content}
      </Modal>
    );
  }
}
