/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import copy                   from 'copy-to-clipboard';
import BrowserTable           from 'dashboard/Data/Browser/BrowserTable.react';
import BrowserToolbar         from 'dashboard/Data/Browser/BrowserToolbar.react';
import ContextMenu            from 'components/ContextMenu/ContextMenu.react';
import * as ColumnPreferences from 'lib/ColumnPreferences';
import ParseApp               from 'lib/ParseApp';
import React                  from 'react';
import PropTypes              from 'lib/PropTypes';
import { SpecialClasses }     from 'lib/Constants';

/**
 * DataBrowser renders the browser toolbar and data table
 * It also manages the fetching / updating of column size prefs,
 * and the keyboard interactions for the data table.
 */
export default class DataBrowser extends React.Component {
  constructor(props, context) {
    super(props, context);

    const columnPreferences = context.currentApp.columnPreference || {}
    let order = ColumnPreferences.getOrder(
      props.columns,
      context.currentApp.applicationId,
      props.className,
      columnPreferences[props.className]
    );
    this.state = {
      order: order,
      current: null,
      editing: false,
      copyableValue: undefined,
      simplifiedSchema: this.getSimplifiedSchema(props.schema, props.className)
    };

    this.handleKey = this.handleKey.bind(this);
    this.handleHeaderDragDrop = this.handleHeaderDragDrop.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.setCurrent = this.setCurrent.bind(this);
    this.setEditing = this.setEditing.bind(this);
    this.handleColumnsOrder = this.handleColumnsOrder.bind(this);
    this.setCopyableValue = this.setCopyableValue.bind(this);
    this.setContextMenu = this.setContextMenu.bind(this);

    this.saveOrderTimeout = null;
  }

  componentWillReceiveProps(props, context) {
    if (props.className !== this.props.className) {
      const columnPreferences = context.currentApp.columnPreference || {}
      let order = ColumnPreferences.getOrder(
        props.columns,
        context.currentApp.applicationId,
        props.className,
        columnPreferences[props.className]
      );
      this.setState({
        order: order,
        current: null,
        editing: false,
        simplifiedSchema: this.getSimplifiedSchema(props.schema, props.className)
      });
    } else if (Object.keys(props.columns).length !== Object.keys(this.props.columns).length
           || (props.isUnique && props.uniqueField !== this.props.uniqueField)) {
      const columnPreferences = context.currentApp.columnPreference || {}
      let order = ColumnPreferences.getOrder(
        props.columns,
        context.currentApp.applicationId,
        props.className,
        columnPreferences[props.className]
      );
      this.setState({ order });
    }
  }

  componentDidMount() {
    document.body.addEventListener('keydown', this.handleKey);
  }

  componentWillUnmount() {
    document.body.removeEventListener('keydown', this.handleKey);
  }

  updatePreferences(order) {
    if (this.saveOrderTimeout) {
      clearTimeout(this.saveOrderTimeout);
    }
    let appId = this.context.currentApp.applicationId;
    let className = this.props.className;
    this.saveOrderTimeout = setTimeout(() => {
      ColumnPreferences.updatePreferences(order, appId, className)
    }, 1000);
  }

  getSimplifiedSchema(schema, classNameForEditors) {
    const schemaSimplifiedData = {};
    const classSchema = schema.data.get('classes').get(classNameForEditors);
    if (classSchema) {
      classSchema.forEach(({ type, targetClass }, col) => {
        schemaSimplifiedData[col] = {
          type,
          targetClass,
        };
      });
    }
    return schemaSimplifiedData;
  }

  handleResize(index, delta) {
    this.setState(({ order }) => {
      order[index].width = Math.max(60, order[index].width + delta);
      this.updatePreferences(order);
      return { order };
    });
  }

  /**
   * drag and drop callback when header is dropped into valid location
   * @param  {Number} dragIndex  - index of  headerbar moved from
   * @param  {Number} hoverIndex - index of headerbar moved to left of
   */
  handleHeaderDragDrop(dragIndex, hoverIndex) {
    const newOrder = [ ...this.state.order ];
    const movedIndex = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, movedIndex[0]);
    this.setState({ order: newOrder }, () => {
      this.updatePreferences(newOrder);
    });
  }

  handleKey(e) {
    if (this.props.disableKeyControls) {
      return;
    }
    if (
      this.state.editing &&
      this.state.current &&
      this.state.current.row === -1 &&
      this.props.newObject
    ) {
      // if user is editing new row and want to cancel editing cell
      if (e.keyCode === 27) {
        this.setState({
          editing: false
        });
        e.preventDefault();
      }
      return;
    }
    if(!this.state.editing && this.props.newObject){
      // if user is not editing any row but there's new row
      if(e.keyCode === 27){
        this.props.onAbortAddRow();
        e.preventDefault();
      }
    }
    if (this.state.editing) {
      switch (e.keyCode) {
        case 27: // ESC
          this.setState({
            editing: false
          });
          e.preventDefault();
          break;
        default:
          return;
      }
    }
    if (!this.state.current) {
      return;
    }
    switch (e.keyCode) {
      case 8:
      case 46:
        // Backspace or Delete
        let colName = this.state.order[this.state.current.col].name;
        let col = this.props.columns[colName];
        if (col.type !== 'Relation') {
          this.props.updateRow(
            this.state.current.row,
            colName,
            undefined
          );
        }
        e.preventDefault();
        break;
      case 37: // Left
        this.setState({
          current: {
            row: this.state.current.row,
            col: Math.max(this.state.current.col - 1, 0)
          }
        });
        e.preventDefault();
        break;
      case 38: // Up
        this.setState({
          current: {
            row: Math.max(this.state.current.row - 1, 0),
            col: this.state.current.col
          }
        });
        e.preventDefault();
        break;
      case 39: // Right
        this.setState({
          current: {
            row: this.state.current.row,
            col: Math.min(this.state.current.col + 1, this.state.order.length - 1)
          }
        });
        e.preventDefault();
        break;
      case 40: // Down
        this.setState({
          current: {
            row: Math.min(this.state.current.row + 1, this.props.data.length - 1),
            col: this.state.current.col
          }
        });
        e.preventDefault();
        break;
      case 67: // C
        if ((e.ctrlKey || e.metaKey) && this.state.copyableValue !== undefined) {
          copy(this.state.copyableValue); // Copies current cell value to clipboard
          if (this.props.showNote) {
            this.props.showNote('Value copied to clipboard', false);
          }
          e.preventDefault()
        }
        break;
    }
  }

  setEditing(editing) {
    if (this.props.updateRow) {
      if (this.state.editing !== editing) {
        this.setState({ editing: editing });
      }
    }
  }

  setCurrent(current) {
    if (JSON.stringify(this.state.current) !== JSON.stringify(current)) {
      this.setState({ current });
    }
  }

  setCopyableValue(copyableValue) {
    if (this.state.copyableValue !== copyableValue) {
      this.setState({ copyableValue });
    }
  }

  setContextMenu(contextMenuX, contextMenuY, contextMenuItems) {
    this.setState({ contextMenuX, contextMenuY, contextMenuItems });
  }

  handleColumnsOrder(order) {
    this.setState({ order: [ ...order ] }, () => {
      this.updatePreferences(order);
    });
  }

  render() {
    let { className, count, disableSecurityDialog, onCancelPendingEditRows, editCloneRows, ...other } = this.props;
    const { preventSchemaEdits } = this.context.currentApp;
    return (
      <div>
        <BrowserTable
          order={this.state.order}
          current={this.state.current}
          editing={this.state.editing}
          simplifiedSchema={this.state.simplifiedSchema}
          className={className}
          editCloneRows={editCloneRows}
          handleHeaderDragDrop={this.handleHeaderDragDrop}
          handleResize={this.handleResize}
          setEditing={this.setEditing}
          setCurrent={this.setCurrent}
          setCopyableValue={this.setCopyableValue}
          setContextMenu={this.setContextMenu}
          onFilterChange={this.props.onFilterChange}
          {...other} />
        <BrowserToolbar
          count={count}
          hidePerms={className === '_Installation'}
          className={SpecialClasses[className] || className}
          classNameForEditors={className}
          setCurrent={this.setCurrent}
          enableDeleteAllRows={this.context.currentApp.serverInfo.features.schemas.clearAllDataFromClass && !preventSchemaEdits}
          enableExportClass={this.context.currentApp.serverInfo.features.schemas.exportClass && !preventSchemaEdits}
          enableSecurityDialog={this.context.currentApp.serverInfo.features.schemas.editClassLevelPermissions && !disableSecurityDialog && !preventSchemaEdits}
          enableColumnManipulation={!preventSchemaEdits}
          enableClassManipulation={!preventSchemaEdits}
          handleColumnDragDrop={this.handleHeaderDragDrop}
          handleColumnsOrder={this.handleColumnsOrder}
          editCloneRows={editCloneRows}
          onCancelPendingEditRows={onCancelPendingEditRows}
          order={this.state.order}
          {...other} />

        {this.state.contextMenuX && <ContextMenu
          x={this.state.contextMenuX}
          y={this.state.contextMenuY}
          items={this.state.contextMenuItems}
        />}
      </div>
    );
  }
}

DataBrowser.contextTypes = {
  currentApp: PropTypes.instanceOf(ParseApp)
};
