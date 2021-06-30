import Parse from 'parse';
import encode from 'parse/lib/browser/encode';
import React, { Component } from 'react';

import BrowserCell from 'components/BrowserCell/BrowserCell.react';
import styles from 'dashboard/Data/Browser/Browser.scss';

export default class BrowserRow extends Component {
  shouldComponentUpdate(nextProps) {
    const shallowVerifyProps = [...new Set(Object.keys(this.props).concat(Object.keys(nextProps)))]
      .filter(propName => propName !== 'obj');
    if (shallowVerifyProps.some(propName => this.props[propName] !== nextProps[propName])) {
      return true;
    }
    const { obj } = this.props;
    const { obj: nextObj } = nextProps;
    const isRefDifferent = obj !== nextObj;
    return isRefDifferent ? JSON.stringify(obj) !== JSON.stringify(nextObj) : isRefDifferent;
  }

  render() {
    const { className, columns, currentCol, isUnique, obj, onPointerClick, order, readOnlyFields, row, rowWidth, selection, selectRow, setCopyableValue, setCurrent, setEditing, setRelation, onEditSelectedRow, setContextMenu, onFilterChange } = this.props;
    let attributes = obj.attributes;
    return (
      <div className={styles.tableRow} style={{ minWidth: rowWidth }}>
        <span className={styles.checkCell}>
          <input
            type='checkbox'
            checked={selection['*'] || selection[obj.id]}
            onChange={e => selectRow(obj.id, e.target.checked)} />
        </span>
        {order.map(({ name, width, visible }, j) => {
          if (!visible) return null;
          let type = columns[name].type;
          let attr = obj;
          if (!isUnique) {
              attr = attributes[name];
            if (name === 'objectId') {
              attr = obj.id;
            } else if (name === 'ACL' && className === '_User' && !attr) {
              attr = new Parse.ACL({ '*': { read: true }, [obj.id]: { read: true, write: true }});
            } else if (type === 'Relation' && !attr && obj.id) {
              attr = new Parse.Relation(obj, name);
              attr.targetClassName = columns[name].targetClass;
            } else if (type === 'Array' || type === 'Object') {
              // This is needed to avoid unwanted conversions of objects to Parse.Objects.
              // "Parse._encoding" is responsible to convert Parse data into raw data.
              // Since array and object are generic types, we want to render them the way
              // they were stored in the database.
              attr = encode(obj.get(name), undefined, true);
            }
          }
          let hidden = false;
          if (name === 'password' && className === '_User') {
            hidden = true;
          } else if (name === 'sessionToken') {
            if (className === '_User' || className === '_Session') {
              hidden = true;
            }
          }
          return (
            <BrowserCell
              key={name}
              schema={this.props.schema}
              simplifiedSchema={this.props.simplifiedSchema}
              filters={this.props.filters}
              className={className}
              field={name}
              row={row}
              col={j}
              type={type}
              readonly={isUnique || readOnlyFields.indexOf(name) > -1}
              width={width}
              current={currentCol === j}
              onSelect={setCurrent}
              onEditChange={setEditing}
              onPointerClick={onPointerClick}
              onFilterChange={onFilterChange}
              setRelation={setRelation}
              objectId={obj.id}
              value={attr}
              hidden={hidden}
              setCopyableValue={setCopyableValue}
              setContextMenu={setContextMenu}
              onEditSelectedRow={onEditSelectedRow} />
          );
        })}
      </div>
    );
  }
}
