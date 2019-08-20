/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import { ActionTypes } from 'lib/stores/ConfigStore';
import Button          from 'components/Button/Button.react';
import ConfigDialog    from 'dashboard/Data/Config/ConfigDialog.react';
import EmptyState      from 'components/EmptyState/EmptyState.react';
import Icon            from 'components/Icon/Icon.react';
import { isDate }      from 'lib/DateUtils';
import Parse           from 'parse';
import React           from 'react';
import SidebarAction   from 'components/Sidebar/SidebarAction';
import subscribeTo     from 'lib/subscribeTo';
import TableHeader     from 'components/Table/TableHeader.react';
import TableView       from 'dashboard/TableView.react';
import Toolbar         from 'components/Toolbar/Toolbar.react';

@subscribeTo('Config', 'config')
class Config extends TableView {
  constructor() {
    super();
    this.section = 'Core';
    this.subsection = 'Config';
    this.action = new SidebarAction('Create a parameter', this.createParameter.bind(this));
    this.state = {
      modalOpen: false,
      modalParam: '',
      modalType: 'String',
      modalValue: '',
      modalMasterKeyOnly: false
    };
  }

  componentWillMount() {
    this.props.config.dispatch(ActionTypes.FETCH);
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (this.context !== nextContext) {
      nextProps.config.dispatch(ActionTypes.FETCH);
    }
  }

  renderToolbar() {
    return (
      <Toolbar
        section='Core'
        subsection='Config'>
        <Button color='white' value='Create a parameter' onClick={this.createParameter.bind(this)} />
      </Toolbar>
    );
  }

  renderExtras() {
    if (!this.state.modalOpen) {
      return null;
    }
    return (
      <ConfigDialog
        onConfirm={this.saveParam.bind(this)}
        onCancel={() => this.setState({ modalOpen: false })}
        param={this.state.modalParam}
        type={this.state.modalType}
        value={this.state.modalValue}
        masterKeyOnly={this.state.modalMasterKeyOnly} />
    );
  }

  renderRow(data) {
    let value = data.value;
    let modalValue = value;
    let type = typeof value;

    if (type === 'object') {
      if (isDate(value)) {
        type = 'Date';
        value = value.toISOString();
      } else if (Array.isArray(value)) {
        type = 'Array';
        value = JSON.stringify(value);
        modalValue = value;
      } else if (value instanceof Parse.GeoPoint) {
        type = 'GeoPoint';
        value = `(${value.latitude}, ${value.longitude})`;
        modalValue = data.value.toJSON();
      } else if (data.value instanceof Parse.File) {
        type = 'File';
        value = <a target='_blank' href={data.value.url()}>Open in new window</a>;
      } else {
        type = 'Object';
        value = JSON.stringify(value);
        modalValue = value;
      }
    } else {
      if (type === 'boolean') {
        value = value ? 'true' : 'false';
      }
      type = type.substr(0, 1).toUpperCase() + type.substr(1);
    }
    let openModal = () => this.setState({
      modalOpen: true,
      modalParam: data.param,
      modalType: type,
      modalValue: modalValue,
      modalMasterKeyOnly: data.masterKeyOnly
    });
    let columnStyleLarge = { width: '30%', cursor: 'pointer' };
    let columnStyleSmall = { width: '15%', cursor: 'pointer' };

    let openModalValueColumn = () => {
      if (data.value instanceof Parse.File) {
        return
      }
      openModal()
    }

    return (
      <tr key={data.param}>
        <td style={columnStyleLarge} onClick={openModal}>{data.param}</td>
        <td style={columnStyleSmall} onClick={openModal}>{type}</td>
        <td style={columnStyleLarge} onClick={openModalValueColumn}>{value}</td>
        <td style={columnStyleSmall} onClick={openModal}>{data.masterKeyOnly.toString()}</td>
        <td style={{ textAlign: 'center' }}>
          <a onClick={this.deleteParam.bind(this, data.param)}>
            <Icon width={16} height={16} name='trash-solid' fill='#ff395e' />
          </a>
        </td>
      </tr>
    );
  }

  renderHeaders() {
    return [
      <TableHeader key='parameter' width={30}>Parameter</TableHeader>,
      <TableHeader key='type' width={15}>Type</TableHeader>,
      <TableHeader key='value' width={30}>Value</TableHeader>,
      <TableHeader key='masterKeyOnly' width={15}>Master key only</TableHeader>
    ];
  }

  renderEmpty() {
    return (
      <EmptyState
        title='Dynamically configure your app'
        description='Set up parameters that let you control the appearance or behavior of your app.'
        icon='gears'
        cta='Create your first parameter'
        action={this.createParameter.bind(this)} />
    );
  }

  tableData() {
    let data = undefined;
    if (this.props.config.data) {
      let params = this.props.config.data.get('params');
      let masterKeyOnlyParams = this.props.config.data.get('masterKeyOnly');
      if (params) {
        data = [];
        params.forEach((value, param) => {
          let type = typeof value;
          let masterKeyOnly = masterKeyOnlyParams !== undefined && masterKeyOnlyParams.includes(value);
          if (type === 'object' && value.__type == 'File') {
            value = Parse.File.fromJSON(value);
          }
          else if (type === 'object' && value.__type == 'GeoPoint') {
            value = new Parse.GeoPoint(value);
          }
          data.push({ param: param, value: value, masterKeyOnly: masterKeyOnly })
        });
        data.sort((object1, object2) => {
          return object1.param.localeCompare(object2.param);
        });
      }
    }
    return data;
  }

  saveParam({ name, value }) {
    this.props.config.dispatch(
      ActionTypes.SET,
      { param: name, value: value, masterKeyOnly: masterKeyOnly }
    ).then(() => {
      this.setState({ modalOpen: false });
    }, () => {
      // Catch the error
    });
  }

  deleteParam(name) {
    this.props.config.dispatch(
      ActionTypes.DELETE,
      { param: name }
    )
  }

  createParameter() {
    this.setState({
      modalOpen: true,
      modalParam: '',
      modalType: 'String',
      modalValue: '',
      modalMasterKeyOnly: false
    });
  }
}

export default Config;
