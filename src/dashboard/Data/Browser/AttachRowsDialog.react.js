import * as Filters from 'lib/Filters';
import Modal from 'components/Modal/Modal.react';
import React from 'react';
import Field from 'components/Field/Field.react';
import Label from 'components/Label/Label.react';
import TextInput from 'components/TextInput/TextInput.react';

const styles = {
  errorList: {
    margin: '3px 6px',
    padding: '3px',
    color: 'red',
    fontSize: '13px',
    lineHeight: '1.4',
    maxHeight: '300px',
    overflow: 'auto',
  },
};

export default class AttachRowsDialog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      objectIds: '',
    };

    this.handleObjectIdsChange = this.handleObjectIdsChange.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
  }

  handleObjectIdsChange(objectIds) {
    this.setState({ objectIds });
  }

  handleConfirm() {
    this.props.onConfirm(this.state.objectIds);
  }

  render() {
    const {
      relation,
      onCancel,
      onConfirm,
      errors,
    } = this.props;
    let errorStatus;
    if (errors) {
      const errorList = [];
      errors.forEach((error) => {
        errorList.push((
          <div style={styles.errorText}>
            * {error}
          </div>
        ));
      });
      errorStatus = (
        <div style={styles.errorList}>
          {errorList}
        </div>
      );
    }
    return (
      <Modal
        type={Modal.Types.info}
        icon="plus"
        iconSize={40}
        title="Attach Rows"
        subtitle={`Bring existing rows from ${relation.targetClassName}`}
        onCancel={this.props.onCancel}
        onConfirm={this.handleConfirm}
      >
        <Field
          label={
            <Label
              text="objectIds"
              description={`ids of ${relation.targetClassName} rows to attach`}
            />
          }
          input={
            <TextInput
              placeholder="ox0QZFl7eg, qs81Q72lTL, etc..."
              value={this.state.objectIds}
              onChange={this.handleObjectIdsChange}
            />
          }
        />
        {errorStatus}
      </Modal>
    );
  }
}
