/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import BrowserRow             from 'components/BrowserRow/BrowserRow.react';
import * as browserUtils      from 'lib/browserUtils';
import DataBrowserHeaderBar   from 'components/DataBrowserHeaderBar/DataBrowserHeaderBar.react';
import Editor                 from 'dashboard/Data/Browser/Editor.react';
import EmptyState             from 'components/EmptyState/EmptyState.react';
import Icon                   from 'components/Icon/Icon.react';
import Parse                  from 'parse';
import encode                 from 'parse/lib/browser/encode';
import React                  from 'react';
import styles                 from 'dashboard/Data/Browser/Browser.scss';
import Button                 from 'components/Button/Button.react';
import ParseApp               from 'lib/ParseApp';
import PropTypes              from 'lib/PropTypes';

const MAX_ROWS = 200; // Number of rows to render at any time
const ROWS_OFFSET = 160;
const ROW_HEIGHT = 31;

const READ_ONLY = [ 'objectId', 'createdAt', 'updatedAt' ];

export default class BrowserTable extends React.Component {
  constructor() {
    super();

    this.state = {
      offset: 0,
    };
    this.handleScroll = this.handleScroll.bind(this);
  }

  componentWillReceiveProps(props) {
    if (props.className !== this.props.className) {
      this.setState({
        offset: 0,
      });
      this.refs.table.scrollTop = 0;
    } else if (this.props.newObject !== props.newObject) {
      this.setState({ offset: 0 });
      this.refs.table.scrollTop = 0;
    } else if (this.props.ordering !== props.ordering) {
      this.setState({ offset: 0 });
      this.refs.table.scrollTop = 0;
    }
  }

  componentDidMount() {
    this.refs.table.addEventListener('scroll', this.handleScroll);
  }

  componentWillUnmount() {
    this.refs.table.removeEventListener('scroll', this.handleScroll);
  }

  handleScroll() {
    if (!this.props.data || this.props.data.length === 0) {
      return;
    }
    requestAnimationFrame(() => {
      const currentScrollTop = this.refs.table.scrollTop;
      let rowsAbove = Math.floor(currentScrollTop / ROW_HEIGHT);
      let offset = this.state.offset;
      const currentRow = rowsAbove - this.state.offset;

      // If the scroll is near the beginning or end of the offset,
      // we need to update the table data with the previous/next offset
      if (currentRow < 10 || currentRow >= ROWS_OFFSET) {
        // Rounds the number of rows above
        rowsAbove = Math.floor(rowsAbove / 10) * 10;

        offset = currentRow < 10
          ? Math.max(0, rowsAbove - ROWS_OFFSET) // Previous set of rows
          : rowsAbove - 10; // Next set of rows
      }
      if (this.state.offset !== offset) {
        this.setState({ offset });
        this.refs.table.scrollTop = currentScrollTop;
      }
      if (this.props.maxFetched - offset <= ROWS_OFFSET * 1.4) {
        this.props.fetchNextPage();
      }
    });
  }

  render() {
    let ordering = {};
    if (this.props.ordering) {
      if (this.props.ordering[0] === '-') {
        ordering = { col: this.props.ordering.substr(1), direction: 'descending' };
      } else {
        ordering = { col: this.props.ordering, direction: 'ascending' };
      }
    }

    let headers = this.props.order.map(({ name, width, visible, preventSort }) => (
      {
        width: width,
        name: name,
        type: this.props.columns[name].type,
        targetClass: this.props.columns[name].targetClass,
        order: ordering.col === name ? ordering.direction : null,
        visible,
        preventSort
      }
    ));
    let editor = null;
    let table = <div ref='table' />;
    if (this.props.data) {
      const rowWidth = this.props.order.reduce(
        (rowWidth, { visible, width }) => visible ? rowWidth + width : rowWidth,
        this.props.onAddRow ? 210 : 0
      );
      let newRow = null;
      if (this.props.newObject && this.state.offset <= 0) {
        const currentCol = this.props.current && this.props.current.row === -1 ? this.props.current.col : undefined;
        newRow = (
          <div style={{ borderBottom: '1px solid #169CEE' }}>
            <BrowserRow
              key={-1}
              className={this.props.className}
              columns={this.props.columns}
              currentCol={currentCol}
              isUnique={this.props.isUnique}
              obj={this.props.newObject}
              onPointerClick={this.props.onPointerClick}
              onFilterChange={this.props.onFilterChange}
              order={this.props.order}
              readOnlyFields={READ_ONLY}
              row={-1}
              rowWidth={rowWidth}
              selection={this.props.selection}
              selectRow={this.props.selectRow}
              setCurrent={this.props.setCurrent}
              setEditing={this.props.setEditing}
              setRelation={this.props.setRelation}
              setCopyableValue={this.props.setCopyableValue}
              setContextMenu={this.props.setContextMenu}
              onEditSelectedRow={this.props.onEditSelectedRow}
            />
            <Button
              value="Add"
              width="55px"
              primary={true}
              onClick={() => {
                this.props.onSaveNewRow();
                this.props.setEditing(false);
              }}
              additionalStyles={{ fontSize: '12px', height: '20px', lineHeight: '20px', margin: '5px', padding: '0'}}
            />
            <Button
              value="Cancel"
              width="55px"
              onClick={this.props.onAbortAddRow}
              additionalStyles={{ fontSize: '12px', height: '20px', lineHeight: '20px', margin: '5px', padding: '0'}}
            />
          </div>
        );
      }
      let rows = [];
      let end = Math.min(this.state.offset + MAX_ROWS, this.props.data.length);
      for (let i = this.state.offset; i < end; i++) {
        let index = i - this.state.offset;
        let obj = this.props.data[i];
        const currentCol = this.props.current && this.props.current.row === i ? this.props.current.col : undefined;

        // Needed in order to force BrowserRow to update and re-render (and possibly update columns values),
        // since the "obj" instance will only be updated when the update request is done.
        const isEditingRow = this.props.current && this.props.current.row === i && !!this.props.editing;
        rows[index] = <BrowserRow
          key={index}
          isEditing={isEditingRow}
          className={this.props.className}
          columns={this.props.columns}
          schema={this.props.schema}
          simplifiedSchema={this.props.simplifiedSchema}
          filters={this.props.filters}
          currentCol={currentCol}
          isUnique={this.props.isUnique}
          obj={obj}
          onPointerClick={this.props.onPointerClick}
          onFilterChange={this.props.onFilterChange}
          order={this.props.order}
          readOnlyFields={READ_ONLY}
          row={i}
          rowWidth={rowWidth}
          selection={this.props.selection}
          selectRow={this.props.selectRow}
          setCurrent={this.props.setCurrent}
          setEditing={this.props.setEditing}
          setRelation={this.props.setRelation}
          setCopyableValue={this.props.setCopyableValue}
          setContextMenu={this.props.setContextMenu}
          onEditSelectedRow={this.props.onEditSelectedRow} />
      }

      if (this.props.editing) {
        let visible = false;
        if (this.props.current) {
          if (this.props.current.row < 0 && this.state.offset === 0) {
            visible = true;
          } else if (this.props.current.row >= this.state.offset && this.props.current.row < end) {
            visible = true;
          }
        }
        if (visible) {
          let { name, width } = this.props.order[this.props.current.col];
          let { type, targetClass } = this.props.columns[name];
          let readonly = this.props.isUnique || READ_ONLY.indexOf(name) > -1;
          if (name === 'sessionToken') {
            if (this.props.className === '_User' || this.props.className === '_Session') {
              readonly = true;
            }
          }
          if(name === 'expiresAt' && this.props.className === '_Session'){
            readonly = true;
          }
          let obj = this.props.current.row < 0 ? this.props.newObject : this.props.data[this.props.current.row];
          let value = obj;
          if (!this.props.isUnique) {
            if (type === 'Array' || type === 'Object') {
              // This is needed to avoid unwanted conversions of objects to Parse.Objects.
              // "Parse._encoding" is responsible to convert Parse data into raw data.
              // Since array and object are generic types, we want to edit them the way
              // they were stored in the database.
              value = encode(obj.get(name), undefined, true);
            } else {
              value = obj.get(name);
            }
          }
          if (name === 'objectId') {
            if (!this.props.isUnique) {
              value = obj.id;
            }
          } else if (name === 'ACL' && this.props.className === '_User' && !value) {
            value = new Parse.ACL({ '*': { read: true }, [obj.id]: { read: true, write: true }});
          } else if (name === 'password' && this.props.className === '_User') {
            value = '';
          }
          let wrapTop = Math.max(0, this.props.current.row * ROW_HEIGHT);
          if (this.props.current.row > -1 && this.props.newObject) {
            wrapTop += 60;
          }
          let wrapLeft = 30;
          for (let i = 0; i < this.props.current.col; i++) {
            const column = this.props.order[i];
            wrapLeft += column.visible ? column.width : 0;
          }
          if (!this.props.isUnique) {
            editor = (
              <Editor
                top={wrapTop}
                left={wrapLeft}
                type={type}
                targetClass={targetClass}
                value={value}
                readonly={readonly}
                width={width}
                onCommit={(newValue) => {
                  if (newValue !== value) {
                    this.props.updateRow(
                      this.props.current.row,
                      name,
                      newValue
                    );
                  }
                  this.props.setEditing(false);
                }}
                onCancel={() =>this.props.setEditing(false)} />
            );
          }
        }
      }

      let addRow = null;
      if (!this.props.newObject && this.props.onAddRow) {
        if (this.props.relation) {
          addRow = (
            <div className={styles.addRow}>
              <Button
                onClick={this.props.onAddRow}
                primary
                value={`Create a ${this.props.relation.targetClassName} and attach`}
              />
              {' '}
              <Button
                onClick={this.props.onAttachRows}
                primary
                value={`Attach existing rows from ${this.props.relation.targetClassName}`}
              />
            </div>
          );
        } else if (!this.props.isUnique) {
          addRow = (
            <div className={styles.addRow}>
              <a title='Add Row' onClick={this.props.onAddRow}>
                <Icon
                  name='plus-outline'
                  width={14}
                  height={14}
                />
              </a>
            </div>
          );
        }
      }

      if (this.props.newObject || this.props.data.length > 0) {
        table = (
          <div className={styles.table} ref='table'>
            <div style={{ height: Math.max(0, this.state.offset * ROW_HEIGHT) }} />
            {newRow}
            {rows}
            <div style={{ height: Math.max(0, (this.props.data.length - this.state.offset - MAX_ROWS) * ROW_HEIGHT) }} />
            {addRow}
            {editor}
          </div>
        );
      } else {
        table = (
          <div className={styles.table} ref='table'>
            <div className={styles.empty}>
              {this.props.relation ?
                <EmptyState
                  title='No data to display'
                  description='This relation has no rows. Attach existing rows or create row.'
                  cta={`Create ${this.props.relation.targetClassName} and attach`}
                  action={this.props.onAddRow}
                  secondaryCta={`Attach existing rows from ${this.props.relation.targetClassName}`}
                  secondaryAction={this.props.onAttachRows}
                  icon='files-solid' /> :
                <EmptyState
                  title='No data to display'
                  description={this.props.onAddRow && 'Add a row to store an object in this class.'}
                  icon='files-solid'
                  cta={this.props.onAddRow && 'Add a row'}
                  action={this.props.onAddRow} />
              }
            </div>
          </div>
        );
      }
    }

    return (
      <div className={[styles.browser, browserUtils.isSafari() ? styles.safari : ''].join(' ')}>
        {table}
        <DataBrowserHeaderBar
          selected={
            this.props.selection &&
            this.props.data &&
            Object.values(this.props.selection).filter(checked => checked).length === this.props.data.length
          }
          selectAll={checked => this.props.data.forEach(({ id }) => this.props.selectRow(id, checked))}
          headers={headers}
          updateOrdering={this.props.updateOrdering}
          readonly={!!this.props.relation || !!this.props.isUnique}
          handleDragDrop={this.props.handleHeaderDragDrop}
          onResize={this.props.handleResize}
          onAddColumn={this.props.onAddColumn}
          preventSchemaEdits={this.context.currentApp.preventSchemaEdits} />
      </div>
    );
  }
}

BrowserTable.contextTypes = {
  currentApp: PropTypes.instanceOf(ParseApp)
};

