/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import * as Filters  from 'lib/Filters';
import Button        from 'components/Button/Button.react';
import Filter        from 'components/Filter/Filter.react';
import FilterRow     from 'components/BrowserFilter/FilterRow.react';
import Icon          from 'components/Icon/Icon.react';
import Popover       from 'components/Popover/Popover.react';
import Position      from 'lib/Position';
import React         from 'react';
import ReactDOM      from 'react-dom';
import styles        from 'components/BrowserFilter/BrowserFilter.scss';
import { List, Map } from 'immutable';

const POPOVER_CONTENT_ID = 'browserFilterPopover';

export default class BrowserFilter extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      filters: new List(),
      blacklistedFilters: Filters.BLACKLISTED_FILTERS.concat(props.blacklistedFilters)
    };
    this.toggle = this.toggle.bind(this);
  }

  componentDidMount() {
    this.node = ReactDOM.findDOMNode(this);
  }

  componentWillReceiveProps(props) {
    if (props.className !== this.props.className) {
      this.setState({ open: false });
    }
  }

  toggle() {
    let filters = this.props.filters;
    if (this.props.filters.size === 0) {
      let available = Filters.availableFilters(this.props.schema, null, this.state.blacklistedFilters);
      let field = Object.keys(available)[0];
      filters = new List([
        new Map({ field: field, constraint: available[field][0] })
      ]);
    }
    this.setState(prevState => ({
      open: !prevState.open,
      filters: filters
    }));
    this.props.setCurrent(null);
  }

  addRow() {
    let available = Filters.availableFilters(this.props.schema, this.state.filters, this.state.blacklistedFilters);
    let field = Object.keys(available)[0];
    this.setState(({ filters }) => ({
      filters: filters.push(
        new Map({ field: field, constraint: available[field][0] })
      )
    }));
  }

  clear() {
    this.props.onChange(new Map());
  }

  apply() {
    let formatted = this.state.filters.map(filter => {
      // TODO: type is unused?
      /*let type = this.props.schema[filter.get('field')].type;
      if (Filters.Constraints[filter.get('constraint')].hasOwnProperty('field')) {
        type = Filters.Constraints[filter.get('constraint')].field;
      }*/
      return filter;
    });
    this.props.onChange(formatted);
  }

  render() {
    let popover = null;
    let buttonStyle = [styles.entry];

    if (this.state.open) {
      let position = Position.inDocument(this.node);
      let popoverStyle = [styles.popover];
      buttonStyle.push(styles.title);

      if (this.props.filters.size) {
        popoverStyle.push(styles.active);
      }
      let available = Filters.availableFilters(
        this.props.schema,
        this.state.filters
      );
      popover = (
        <Popover fixed={true} position={position} onExternalClick={this.toggle} contentId={POPOVER_CONTENT_ID}>
          <div className={popoverStyle.join(' ')} onClick={() => this.props.setCurrent(null)} id={POPOVER_CONTENT_ID}>
            <div onClick={this.toggle} style={{ cursor: 'pointer', width: this.node.clientWidth, height: this.node.clientHeight }}></div>
            <div className={styles.body}>
              <Filter
                blacklist={this.state.blacklistedFilters}
                schema={this.props.schema}
                filters={this.state.filters}
                onChange={filters => this.setState({ filters: filters })}
                renderRow={props => (
                  <FilterRow {...props} active={this.props.filters.size > 0} parentContentId={POPOVER_CONTENT_ID} />
                )}
              />
              <div className={styles.footer}>
                <Button
                  color="white"
                  value="Clear all"
                  disabled={this.state.filters.size === 0}
                  width="120px"
                  onClick={this.clear.bind(this)}
                />
                <Button
                  color="white"
                  value="Add filter"
                  disabled={Object.keys(available).length === 0}
                  width="120px"
                  onClick={this.addRow.bind(this)}
                />
                <Button
                  color="white"
                  primary={true}
                  value="Apply these filters"
                  width="245px"
                  onClick={this.apply.bind(this)}
                />
              </div>
            </div>
          </div>
        </Popover>
      );
    }
    if (this.props.filters.size) {
      buttonStyle.push(styles.active);
    }
    if (this.props.disabled) {
      buttonStyle.push(styles.disabled);
    }
    return (
      <div className={styles.wrap}>
        <div className={buttonStyle.join(' ')} onClick={this.toggle}>
          <Icon name="filter-solid" width={14} height={14} />
          <span>{this.props.filters.size ? 'Filtered' : 'Filter'}</span>
        </div>
        {popover}
      </div>
    );
  }
}
