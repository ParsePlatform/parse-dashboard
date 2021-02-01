/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import * as Filters              from 'lib/Filters';
import { List, Map }             from 'immutable';
import { dateStringUTC }         from 'lib/DateUtils';
import getFileName               from 'lib/getFileName';
import Parse                     from 'parse';
import Pill                      from 'components/Pill/Pill.react';
import React, { Component }      from 'react';
import styles                    from 'components/BrowserCell/BrowserCell.scss';
import { unselectable }          from 'stylesheets/base.scss';

export default class BrowserCell extends Component {
  constructor() {
    super();

    this.cellRef = React.createRef();
    this.copyableValue = undefined;
  }

  componentDidUpdate() {
    if (this.props.current) {
      const node = this.cellRef.current;
      const { setRelation } = this.props;
      const { left, right, bottom, top } = node.getBoundingClientRect();

      // Takes into consideration Sidebar width when over 980px wide.
      // If setRelation is undefined, DataBrowser is used as ObjectPicker, so it does not have a sidebar.
      const leftBoundary = window.innerWidth > 980 && setRelation ? 300 : 0;

      // BrowserToolbar + DataBrowserHeader height
      const topBoundary = 126;

      if (left < leftBoundary || right > window.innerWidth) {
        node.scrollIntoView({ block: 'nearest', inline: 'start' });
      } else if (top < topBoundary || bottom > window.innerHeight) {
        node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }

      if (!this.props.hidden) {
        this.props.setCopyableValue(this.copyableValue);
      }
    }
  }

  shouldComponentUpdate(nextProps) {
    const shallowVerifyProps = [...new Set(Object.keys(this.props).concat(Object.keys(nextProps)))]
      .filter(propName => propName !== 'value');
    if (shallowVerifyProps.some(propName => this.props[propName] !== nextProps[propName])) {
      return true;
    }
    const { value } = this.props;
    const { value: nextValue } = nextProps;
    if (typeof value !== typeof nextValue) {
      return true;
    }
    const isRefDifferent = value !== nextValue;
    if (isRefDifferent && typeof value === 'object') {
      return JSON.stringify(value) !== JSON.stringify(nextValue);
    }
    return isRefDifferent;
  }

  //#region Cell Context Menu related methods

  onContextMenu(event) {
    if (event.type !== 'contextmenu') { return; }
    event.preventDefault();

    const { field, hidden, onSelect, setCopyableValue, setContextMenu, row, col } = this.props;

    onSelect({ row, col });
    setCopyableValue(hidden ? undefined : this.copyableValue);

    const available = Filters.availableFilters(this.props.simplifiedSchema, this.props.filters, Filters.BLACKLISTED_FILTERS);
    const constraints = available && available[field];

    const { pageX, pageY } = event;
    const menuItems = this.getContextMenuOptions(constraints);
    menuItems.length && setContextMenu(pageX, pageY, menuItems);
  }

  getContextMenuOptions(constraints) {
    let { onEditSelectedRow } = this.props;
    const contextMenuOptions = [];

    const setFilterContextMenuOption = this.getSetFilterContextMenuOption(constraints);
    setFilterContextMenuOption && contextMenuOptions.push(setFilterContextMenuOption);

    const addFilterContextMenuOption = this.getAddFilterContextMenuOption(constraints);
    addFilterContextMenuOption && contextMenuOptions.push(addFilterContextMenuOption);

    const relatedObjectsContextMenuOption = this.getRelatedObjectsContextMenuOption();
    relatedObjectsContextMenuOption && contextMenuOptions.push(relatedObjectsContextMenuOption);

    onEditSelectedRow && contextMenuOptions.push({
      text: 'Edit row',
      callback: () => {
        let { objectId, onEditSelectedRow } = this.props;
        onEditSelectedRow(true, objectId);
      }
    });

    return contextMenuOptions;
  }

  getSetFilterContextMenuOption(constraints) {
    if (constraints) {
      return {
        text: 'Set filter...', items: constraints.map(constraint => {
          const definition = Filters.Constraints[constraint];
          const text = `${this.props.field} ${definition.name}${definition.comparable ? (' ' + this.copyableValue) : ''}`;
          return {
            text,
            callback: this.pickFilter.bind(this, constraint)
          };
        })
      };
    }
  }

  getAddFilterContextMenuOption(constraints) {
    if (constraints && this.props.filters && this.props.filters.size > 0) {
      return {
        text: 'Add filter...', items: constraints.map(constraint => {
          const definition = Filters.Constraints[constraint];
          const text = `${this.props.field} ${definition.name}${definition.comparable ? (' ' + this.copyableValue) : ''}`;
          return {
            text,
            callback: this.pickFilter.bind(this, constraint, true)
          };
        })
      };
    }
  }

  /**
   * Returns "Get related records from..." context menu item if cell holds a Pointer
   * or objectId and there's a class in relation.
   */
  getRelatedObjectsContextMenuOption() {
    const { value, schema, onPointerClick } = this.props;

    const pointerClassName = (value && value.className)
      || (this.props.field === 'objectId' && this.props.className);
    if (pointerClassName) {
      const relatedRecordsMenuItem = { text: 'Get related records from...', items: [] };
      schema.data.get('classes').sortBy((v, k) => k).forEach((cl, className) => {
        cl.forEach((column, field) => {
          if (column.targetClass !== pointerClassName) { return; }
          relatedRecordsMenuItem.items.push({
            text: className, callback: () => {
              let relatedObject = value;
              if (this.props.field === 'objectId') {
                relatedObject = new Parse.Object(pointerClassName);
                relatedObject.id = value;
              }
              onPointerClick({ className, id: relatedObject.toPointer(), field })
            }
          })
        });
      });

      return relatedRecordsMenuItem.items.length ? relatedRecordsMenuItem : undefined;
    }
  }

  pickFilter(constraint, addToExistingFilter) {
    const definition = Filters.Constraints[constraint];
    const { filters, type, value, field } = this.props;
    const newFilters = addToExistingFilter ? filters : new List();
    let compareTo;
    if (definition.comparable) {
      switch (type) {
        case 'Pointer':
          compareTo = value.toPointer()
          break;
        case 'Date':
          compareTo = value.__type ? value : {
            __type: 'Date',
            iso: value
          };
          break;

        default:
          compareTo = value;
          break;
      }
    }

    this.props.onFilterChange(newFilters.push(new Map({
      field,
      constraint,
      compareTo
    })));
  }

  //#endregion

  render() {
    let { type, value, hidden, width, current, onSelect, onEditChange, setCopyableValue, setRelation, onPointerClick, row, col, field, onEditSelectedRow } = this.props;
    let content = value,
        contentArray = []
    this.copyableValue = content;
    let classes = [styles.cell, unselectable];
    if (hidden) {
      content = '(hidden)';
      classes.push(styles.empty);
    } else if (value === undefined) {
      if (type === 'ACL') {
        this.copyableValue = content = 'Public Read + Write';
      } else {
        this.copyableValue = content = '(undefined)';
        classes.push(styles.empty);
      }
    } else if (value === null) {
      this.copyableValue = content = '(null)';
      classes.push(styles.empty);
    } else if (value === '') {
      content = <span>&nbsp;</span>;
      classes.push(styles.empty);
    } else if (type === 'Pointer') {
      if (value && value.__type) {
        const object = new Parse.Object(value.className);
        object.id = value.objectId;
        value = object;
      }
      content = onPointerClick ? (
        <a href='javascript:;' onClick={onPointerClick.bind(undefined, value)}>
          <Pill value={value.id} />
        </a>
      ) : (
          value.id
        );
      this.copyableValue = value.id;
    } else if (type === 'Date') {
      if (typeof value === 'object' && value.__type) {
        value = new Date(value.iso);
      } else if (typeof value === 'string') {
        value = new Date(value);
      }
      this.copyableValue = content = dateStringUTC(value);
    } else if (type === 'Boolean') {
      this.copyableValue = content = value ? 'True' : 'False';
    } else if (type === 'Array') {
      this.copyableValue = '';
      contentArray.push('[');
      for (var i=0;i<value.length;i++) {
        let val = value[i];
        if (val === null) {
          this.copyableValue += content = '(undefined)';
          classes.push(styles.empty);
        } if (val === '') {
          contentArray.push(<span>&nbsp;</span>);
          classes.push(styles.empty);
        } else if (val && val.__type === 'Pointer') {
          const object = new Parse.Object(val.className);
          object.id = val.objectId;
          value[i] = object;
          val = object;
          contentArray.push(onPointerClick ? (
            <a href='javascript:;' onClick={onPointerClick.bind(undefined, val)}>
              <Pill value={val.id} />
            </a>
          ) : (
              val.id
            ))
          this.copyableValue += val.id;
        } else if (val && val.__type === 'Date' || new Date(val)) {
          if (typeof val === 'object' && val.__type) {
            value[i] = new Date(val.iso);
            val = value[i];
          } else if (typeof val === 'string' && new Date(val)) {
            value[i] = new Date(val);
            val = value[i];
          }
          this.copyableValue +=  dateStringUTC(val);
        } else if (val && val.__type === 'File') {
          const fileName = val._url ? getFileName(val) : 'Uploading\u2026';
          contentArray.push(<Pill value={fileName} />);
          this.copyableValue += fileName;
        }  else if (type === 'Boolean') {
          this.copyableValue += val;
        } else {
          contentArray.push(JSON.stringify(val));
          this.copyableValue += JSON.stringify(val);
        }
        if (i+1 != value.length) {
          contentArray.push(',');
        }
      }
      contentArray.push(']');
    } else if (type === 'Object' || type === 'Bytes') {
      this.copyableValue = content = JSON.stringify(value);
    } else if (type === 'File') {
      const fileName = value.url() ? getFileName(value) : 'Uploading\u2026';
      content = <Pill value={fileName} />;
      this.copyableValue = fileName;
    } else if (type === 'ACL') {
      let pieces = [];
      let json = value.toJSON();
      if (Object.prototype.hasOwnProperty.call(json, '*')) {
        if (json['*'].read && json['*'].write) {
          pieces.push('Public Read + Write');
        } else if (json['*'].read) {
          pieces.push('Public Read');
        } else if (json['*'].write) {
          pieces.push('Public Write');
        }
      }
      for (let role in json) {
        if (role !== '*') {
          pieces.push(role);
        }
      }
      if (pieces.length === 0) {
        pieces.push('Master Key Only');
      }
      this.copyableValue = content = pieces.join(', ');
    } else if (type === 'GeoPoint') {
      this.copyableValue = content = `(${value.latitude}, ${value.longitude})`;
    } else if (type === 'Polygon') {
      this.copyableValue = content = value.coordinates.map(coord => `(${coord})`)
    } else if (type === 'Relation') {
      content = setRelation ? (
        <div style={{ textAlign: 'center', cursor: 'pointer' }}>
          <Pill onClick={() => setRelation(value)} value='View relation' />
        </div>
      ) : (
          'Relation'
        );
      this.copyableValue = undefined;
    }
    if (contentArray.length == 0) {
      contentArray = [content];
    }
    if (current) {
      classes.push(styles.current);
    }
    return (
      <span
        ref={this.cellRef}
        className={classes.join(' ')}
        style={{ width }}
        onClick={() => {
          onSelect({ row, col });
          setCopyableValue(hidden ? undefined : this.copyableValue);
        }}
        onDoubleClick={() => {
          // Since objectId can't be edited, double click event opens edit row dialog
          if (field === 'objectId' && onEditSelectedRow) {
            onEditSelectedRow(true, value);
          } else if (type !== 'Relation') {
            onEditChange(true)
          }
        }}
        onTouchEnd={e => {
          if (current && type !== 'Relation') {
            // The touch event may trigger an unwanted change in the column value
            if (['ACL', 'Boolean', 'File'].includes(type)) {
              e.preventDefault();
            }
            onEditChange(true);
          }
        }}
        onContextMenu={this.onContextMenu.bind(this)}
      >
        {contentArray.map((val,index) => <div style={{ display: 'inline-block'}} key={index + val}> {val} </div>)} 
      </span>
    );
  }
}
