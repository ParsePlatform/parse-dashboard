/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import Parse              from 'parse'
import React              from 'react';
import semver             from 'semver/preload.js';
import Dropdown           from 'components/Dropdown/Dropdown.react';
import Field              from 'components/Field/Field.react';
import Label              from 'components/Label/Label.react';
import Modal              from 'components/Modal/Modal.react';
import Option             from 'components/Dropdown/Option.react';
import TextInput          from 'components/TextInput/TextInput.react';
import Toggle             from 'components/Toggle/Toggle.react';
import DateTimeInput      from 'components/DateTimeInput/DateTimeInput.react';
import SegmentSelect      from 'components/SegmentSelect/SegmentSelect.react';
import FileInput          from 'components/FileInput/FileInput.react';
import styles             from 'dashboard/Data/Browser/Browser.scss';
import validateNumeric    from 'lib/validateNumeric';
import {
  DataTypes,
  SpecialClasses
}                         from 'lib/Constants';

function validColumnName(name) {
  return !!name.match(/^[a-zA-Z][_a-zA-Z0-9]*$/);
}

export default class AddColumnDialog extends React.Component {
  constructor(props) {
    super();
    this.state = {
      type: 'String',
      target: props.classes[0],
      name: '',
      required: false,
      defaultValue: undefined,
      isDefaultValueValid: true,
      uploadingFile: false
    };
    this.renderDefaultValueInput = this.renderDefaultValueInput.bind(this)
    this.handleDefaultValueChange = this.handleDefaultValueChange.bind(this)
  }

  valid() {
    const { name, isDefaultValueValid } = this.state

    return (
      name &&
      name.length > 0 &&
      validColumnName(this.state.name) &&
      this.props.currentColumns.indexOf(this.state.name) === -1 &&
      isDefaultValueValid
    )
  }

  async handlePointer(objectId, target) {
    const targetClass = new Parse.Object.extend(target)
    const query = new Parse.Query(targetClass)
    const result = await query.get(objectId)
    return result.toPointer()
  }

  getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  async handleFile(file) {
    if (file) {
      let base64 = await this.getBase64(file);
      const parseFile = new Parse.File(file.name, { base64 });
      this.setState({
        uploadingFile: true
      });
      try {
        await parseFile.save();
        return parseFile;
      } catch (err) {
        this.props.showNote(err.message, true);
        return parseFile;
      } finally {
        this.setState({
          uploadingFile: false
        });
      }
    }
  }

  renderClassDropdown() {
    return (
      <Dropdown
        value={this.state.target}
        onChange={(target) => this.setState({ target: target })}>
        {this.props.classes.map((c) => <Option key={c} value={c}>{SpecialClasses[c] || c}</Option>)}
      </Dropdown>
    );
  }

  async handleDefaultValueChange(defaultValue) {
    const { type, target } = this.state
    let formattedValue = undefined
    let isDefaultValueValid = true

    try {
      switch (type) {
        case 'String':
          formattedValue = defaultValue.toString()
          break
        case 'Number':
          if (!validateNumeric(defaultValue)) throw 'Invalid number'
          formattedValue = +defaultValue
          break
        case 'Array':
          if (!Array.isArray(JSON.parse(defaultValue))) throw 'Invalid array'
          formattedValue = JSON.parse(defaultValue)
          break
        case 'Object':
          if (typeof JSON.parse(defaultValue) !== 'object' || Array.isArray(JSON.parse(defaultValue))) throw 'Invalid object'
          formattedValue = JSON.parse(defaultValue)
          break
        case 'Date':
          formattedValue = { __type: 'Date', iso: new Date(defaultValue) }
          break
        case 'Polygon':
          formattedValue = new Parse.Polygon(JSON.parse(defaultValue))
          break
        case 'GeoPoint':
          formattedValue = new Parse.GeoPoint(JSON.parse(defaultValue))
          break;
        case 'Pointer':
          formattedValue = await this.handlePointer(defaultValue, target)
          break
        case 'Boolean':
          formattedValue = (defaultValue === 'True' ? true : (defaultValue === 'False' ? false : undefined))
          break
        case 'File':
          formattedValue = await this.handleFile(defaultValue)
          break
      }
    } catch (e) {
      isDefaultValueValid = defaultValue === ''
    }
    return await this.setState({ defaultValue: formattedValue, isDefaultValueValid })
  }

  renderDefaultValueInput() {
    const { type } = this.state
    switch (type) {
      case 'Array':
      case 'Object':
      case 'Polygon':
      case 'GeoPoint':
        return <TextInput
          placeholder='Set here a default value'
          multiline={true}
          onChange={async (defaultValue) => await this.handleDefaultValueChange(defaultValue)} />
      case 'Number':
      case 'String':
      case 'Pointer':
        return <TextInput
          placeholder={type === 'Pointer' ? 'Set a valid object ID here' : 'Set a default value here'}
          onChange={async (defaultValue) => await this.handleDefaultValueChange(defaultValue)} />
      case 'Date':
        return <DateTimeInput
          value={this.state.defaultValue && this.state.defaultValue.__type === 'Date' ? this.state.defaultValue.iso : undefined}
          onChange={async (defaultValue) => await this.handleDefaultValueChange(defaultValue)} />
      case 'Boolean':
        return <SegmentSelect
          values={['False', 'None', 'True']}
          current={(this.state.defaultValue ? 'True' : (this.state.defaultValue === false ? 'False' : 'None'))}
          onChange={async (defaultValue) => await this.handleDefaultValueChange(defaultValue)} />
      case 'File':
        return <FileInput
          value={this.state.defaultValue ? this.state.defaultValue._name : ''}
          uploading={this.state.uploadingFile}
          onChange={async (defaultValue) => await this.handleDefaultValueChange(defaultValue)} />
    }
  }


  render() {
    let typeDropdown = (
      <Dropdown
        value={this.state.type}
        onChange={(type) => this.setState({ type: type, defaultValue: undefined, required: false })}>
        {DataTypes.map((t) => <Option key={t} value={t}>{t}</Option>)}
      </Dropdown>
    );
    return (
      <Modal
        type={Modal.Types.INFO}
        icon='ellipses'
        iconSize={30}
        title='Add a new column'
        subtitle='Store another type of data in this class.'
        disabled={!this.valid()}
        confirmText='Add column'
        cancelText={'Never mind, don\u2019t.'}
        onCancel={this.props.onCancel}
        continueText={'Create column & add another'}
        showContinue={true}
        onContinue={() => this.props.onContinue(this.state)}
        onConfirm={() => {
          this.props.onConfirm(this.state);
        }}>
        <Field
          label={
            <Label
              text='What type of data do you want to store?' />
          }
          input={typeDropdown} />
        {this.state.type === 'Pointer' || this.state.type === 'Relation' ?
          <Field
            label={<Label text='Target class' />}
            input={this.renderClassDropdown()} /> : null}
        <Field
          label={<Label text='What should we call it?' description={'Don\u2019t use any special characters, and start your name with a letter.'} />}
          input={<TextInput placeholder='Give it a good name...' value={this.state.name} onChange={(name) => this.setState({ name })} />} />
        {
          /*
            Allow include require fields and default values if the parse-server
            version is greater than or equal 3.7.0, that is the minimum version
            support this feature and check if the field is not a relation
          */
          semver.valid(this.props.parseServerVersion) &&
          semver.gte(this.props.parseServerVersion, '3.7.0') &&
          this.state.type !== 'Relation' ?
            <>
              <Field
                label={<Label text='What is the default value?' description='If no value is specified for this column, it will be filled with its default value.' />}
                input={this.renderDefaultValueInput()}
                className={styles.addColumnToggleWrapper} />
              <Field
                label={<Label text='Is it a required field?' description={'When true this field must be filled when a new object is created.'} />}
                input={<Toggle value={this.state.required} type={Toggle.Types.YES_NO} onChange={(required) => this.setState({ required })} additionalStyles={{ margin: '0px' }} />}
                className={styles.addColumnToggleWrapper} />
            </>
            : null
        }
      </Modal>
    );
  }
}
