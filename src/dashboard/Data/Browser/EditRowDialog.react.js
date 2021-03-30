import React from 'react';
import Parse from 'parse';
import { dateStringUTC } from 'lib/DateUtils';
import PropTypes from 'lib/PropTypes';
import ParseApp from 'lib/ParseApp';
import Modal from 'components/Modal/Modal.react';
import Field from 'components/Field/Field.react';
import Label from 'components/Label/Label.react';
import TextInput from 'components/TextInput/TextInput.react';
import DateTimeInput from 'components/DateTimeInput/DateTimeInput.react';
import Toggle from 'components/Toggle/Toggle.react';
import Pill from 'components/Pill/Pill.react';
import GeoPointEditor from 'components/GeoPointEditor/GeoPointEditor.react';
import FileEditor from 'components/FileEditor/FileEditor.react';
import ObjectPickerDialog from 'dashboard/Data/Browser/ObjectPickerDialog.react';
import styles from 'dashboard/Data/Browser/Browser.scss';

export default class EditRowDialog extends React.Component {
  constructor(props) {
    super(props);

    const { selectedObject } = this.props;
    const { currentObject, openObjectPickers } = this.initializeState(
      selectedObject
    );
    this.state = { currentObject, openObjectPickers };

    this.updateCurrentObject = this.updateCurrentObject.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.openAcl = this.openAcl.bind(this);
    this.openPointer = this.openPointer.bind(this);
    this.toggleObjectPicker = this.toggleObjectPicker.bind(this);
    this.openRelation = this.openRelation.bind(this);
  }

  componentWillReceiveProps(props) {
    const newSelectedObject = props.selectedObject;
    const previousSelectedObject = this.props.selectedObject;
    if (newSelectedObject.id !== previousSelectedObject.id) {
      const { currentObject, openObjectPickers } = this.initializeState(
        newSelectedObject
      );
      this.setState({ currentObject, openObjectPickers });
    }
  }

  initializeState(newObject) {
    const { columns } = this.props;
    const currentObject = { ...newObject };
    const openObjectPickers = {};
    columns.forEach(column => {
      const { name, type } = column;
      if (['Array', 'Object'].indexOf(type) >= 0) {
        currentObject[name] = JSON.stringify(currentObject[name], null, 2);
      }
      if (type === 'Polygon') {
        currentObject[name] = JSON.stringify(
          (currentObject[name] && currentObject[name].coordinates) || [
            ['lat', 'lon']
          ],
          null,
          2
        );
      }
      if (type === 'Pointer') {
        currentObject[name] =
          (currentObject[name] && currentObject[name].id) || '';
        openObjectPickers[name] = false;
      }
      if (type === 'Relation') {
        openObjectPickers[name] = false;
      }
    });

    return { currentObject, openObjectPickers };
  }

  updateCurrentObject(newValue, name) {
    const { currentObject } = this.state;
    currentObject[name] = newValue;
    this.setState({ currentObject });
  }

  handleChange(newValue, name, type, targetClass, toDelete) {
    if (name == 'password') {
      if (newValue === '') {
        return false;
      } else {
        const { currentObject } = this.state;
        currentObject.password = '';
      }
    }
    const {
      selectedObject,
      className,
      updateRow,
      confirmAttachSelectedRows,
      useMasterKey
    } = this.props;
    if (type === 'Relation') {
      if (toDelete.length > 0) {
        selectedObject[name].remove(toDelete);
        selectedObject[name].parent.save(null, { useMasterKey: useMasterKey });
      }
      if (newValue.length > 0) {
        confirmAttachSelectedRows(
          className,
          selectedObject.id,
          name,
          newValue,
          targetClass
        );
      }
      this.toggleObjectPicker(name, false);
    } else {
      if (['Array', 'Object', 'Polygon'].indexOf(type) >= 0) {
        const { currentObject } = this.state;
        currentObject[name] = JSON.stringify(newValue, null, 2);
        if (type === 'Polygon') {
          newValue = {
            __type: type,
            coordinates: newValue
          };
        }
      }
      if (type === 'Pointer') {
        // when Pointer newValue is array with length 0 or 1
        const pointerId = newValue[0];
        newValue = pointerId
          ? Parse.Object.fromJSON({
              className: targetClass,
              objectId: pointerId
            })
          : undefined;
        this.toggleObjectPicker(name, false);
      }
      updateRow(selectedObject.row, name, newValue);
    }
  }

  openAcl() {
    const { selectedObject, columns, handleShowAcl } = this.props;
    const { row } = selectedObject;
    const col = columns.findIndex(c => c.name === 'ACL');
    handleShowAcl(row, col);
  }

  openPointer(className, id) {
    const { onClose, handlePointerClick } = this.props;
    onClose();
    handlePointerClick({ className: className, id: id });
  }

  openRelation(relation) {
    const { onClose, setRelation } = this.props;
    onClose();
    setRelation(relation);
  }

  toggleObjectPicker(name, isOpen) {
    const { openObjectPickers } = this.state;
    openObjectPickers[name] = isOpen;
    this.setState({ openObjectPickers });
  }

  render() {
    const { selectedObject, className, columns, onClose, schema, useMasterKey } = this.props;
    const { currentObject, openObjectPickers } = this.state;

    const fields = columns.map(column => {
      const { name, type, targetClass } = column;

      const isHidden =
        ['objectId', 'createdAt', 'updatedAt', 'ACL'].indexOf(name) >= 0;

      if (isHidden) {
        return;
      }

      let inputComponent;

      const isDisabled =
        (className === '_User' && ['authData'].indexOf(name) >= 0) ||
        (selectedObject.id &&
          className === '_Role' &&
          ['name'].indexOf(name) >= 0) ||
        (className === '_Session' &&
          [
            'sessionToken',
            'expiresAt',
            'user',
            'createdWith',
            'installationId',
            'restricted'
          ].indexOf(name) >= 0);

      switch (type) {
        case 'String':
          inputComponent = (
            <TextInput
              multiline={
                currentObject[name] && currentObject[name].length > 25
                  ? true
                  : false
              }
              disabled={isDisabled}
              placeholder={name === 'password' ? '(hidden)' : ''}
              value={currentObject[name]}
              onChange={newValue => this.updateCurrentObject(newValue, name)}
              onBlur={newValue => this.handleChange(newValue, name)}
            />
          );
          break;
        case 'Number':
          inputComponent = (
            <TextInput
              disabled={isDisabled}
              value={currentObject[name]}
              onChange={newValue => this.updateCurrentObject(newValue, name)}
              onBlur={newValue => this.handleChange(parseFloat(newValue), name)}
            />
          );
          break;
        case 'Array':
        case 'Object':
        case 'Polygon':
          inputComponent = (
            <TextInput
              multiline={true}
              disabled={isDisabled}
              value={currentObject[name]}
              onChange={newValue => this.updateCurrentObject(newValue, name)}
              onBlur={newValue =>
                this.handleChange(JSON.parse(newValue), name, type)
              }
            />
          );
          break;
        case 'Boolean':
          inputComponent = isDisabled ? (
            <TextInput disabled={true} value={selectedObject[name]} />
          ) : (
            <Toggle
              type={Toggle.Types.TRUE_FALSE}
              value={selectedObject[name]}
              onChange={newValue => this.handleChange(newValue, name)}
            />
          );
          break;
        case 'Date':
          inputComponent = (
            <DateTimeInput
              disabled={isDisabled}
              value={selectedObject[name]}
              onChange={newValue => this.handleChange(newValue, name)}
            />
          );
          break;
        case 'GeoPoint':
          inputComponent = (
            <div style={{ padding: '25px' }}>
              <GeoPointEditor
                disableAutoFocus={true}
                value={selectedObject[name]}
                style={{ position: 'inherit' }}
                onCommit={newValue => this.handleChange(newValue, name)}
              />
            </div>
          );
          break;
        case 'File':
          inputComponent = (
            <div style={{ padding: '25px' }}>
              <FileEditor
                value={selectedObject[name]}
                style={{ position: 'inherit' }}
                onCommit={newValue => this.handleChange(newValue, name)}
              />
            </div>
          );
          break;
        case 'Pointer':
          const pointerId = selectedObject[name] && selectedObject[name].id;
          inputComponent = openObjectPickers[name] ? (
              <ObjectPickerDialog
                schema={schema}
                column={column}
                className={targetClass}
                pointerId={pointerId}
                onConfirm={newValue =>
                  this.handleChange(newValue, name, type, targetClass)
                }
                onCancel={() => this.toggleObjectPicker(name, false)}
                useMasterKey={useMasterKey}
              />
          ) : (
            <div
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                paddingTop: pointerId ? '17px' : '35px'
              }}
            >
              {pointerId && (
                <Pill
                  onClick={() => this.openPointer(targetClass, pointerId)}
                  value={pointerId}
                />
              )}
              <Pill
                onClick={() => this.toggleObjectPicker(name, true)}
                value={`Select ${name}`}
              />
            </div>
          );
          break;
        case 'Relation':
          // fallback if selectedObject is just saved, so it still doesn't have relation properites set
          const relation =
            selectedObject[name] || new Parse.Relation(selectedObject, name);
          relation.targetClassName = targetClass;

          inputComponent = openObjectPickers[name] ? (
              <ObjectPickerDialog
                schema={schema}
                column={column}
                className={targetClass}
                relation={relation}
                onConfirm={(newValue, toDelete) =>
                  this.handleChange(newValue, name, type, targetClass, toDelete)
                }
                onCancel={() => this.toggleObjectPicker(name, false)}
                useMasterKey={useMasterKey}
              />
          ) : (
            selectedObject.id && (
              <div
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  paddingTop: '17px'
                }}
              >
                <Pill
                  onClick={() => this.openRelation(relation)}
                  value={`View ${type}`}
                />
                <Pill
                  onClick={() => this.toggleObjectPicker(name, true)}
                  value={`Select ${name}`}
                />
              </div>
            )
          );
          break;
        default:
          inputComponent = <div />;
      }

      return (
        <Field
          key={name}
          label={
            <Label
              text={name}
              description={targetClass ? `${type} <${targetClass}>` : type}
            />
          }
          labelWidth={33}
          input={inputComponent}
        />
      );
    });

    return (
      <Modal
        open
        type={Modal.Types.INFO}
        icon="edit-solid"
        iconSize={30}
        title={
          selectedObject.id ? (
            <span>
              Edit <strong>{selectedObject.id}</strong>
            </span>
          ) : (
            <span>
              New <strong>{className}</strong>
            </span>
          )
        }
        subtitle={
          <div style={{ paddingTop: '5px', fontSize: '12px' }}>
            {selectedObject.createdAt && (
              <p>
                CreatedAt{' '}
                <strong>{dateStringUTC(selectedObject.createdAt)}</strong>
              </p>
            )}
            {selectedObject.updatedAt && (
              <p>
                UpdatedAt{' '}
                <strong>{dateStringUTC(selectedObject.updatedAt)}</strong>
              </p>
            )}
          </div>
        }
        onCancel={onClose}
        onConfirm={this.openAcl}
        confirmText="Edit ACL"
        cancelText="Close"
      >
        <div className={[styles.objectPickerContent]}>{fields}</div>
      </Modal>
    );
  }
}

EditRowDialog.contextTypes = {
  currentApp: PropTypes.instanceOf(ParseApp)
};
