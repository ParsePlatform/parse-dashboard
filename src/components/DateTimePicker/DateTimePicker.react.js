/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Button                               from 'components/Button/Button.react';
import Calendar                             from 'components/Calendar/Calendar.react';
import { hoursFrom, getDateMethod } from 'lib/DateUtils';
import PropTypes                            from 'lib/PropTypes';
import React                                from 'react';
import styles                               from 'components/DateTimePicker/DateTimePicker.scss';

export default class DateTimePicker extends React.Component {
  constructor(props) {
    super();
    let timeRef = props.value || hoursFrom(new Date(), 1);
    this.state = {
      showPasteBtn: false,
      copyableDate: null,
      defaultValue: null,
      hours: String(timeRef[getDateMethod(props.local, 'getHours')]()),
      minutes: (timeRef[getDateMethod(props.local, 'getMinutes')]() < 10 ? '0' : '') + String(timeRef[getDateMethod(props.local, 'getMinutes')]()),
    }
  }

  async componentDidMount(){
    const status = await navigator.permissions.query({name:'clipboard-read'});
    if ( status.state === 'granted' ) {
      const text = await navigator.clipboard.readText();
      const date = Date.parse(text);
      if ( !isNaN(date) ) {
        this.setState({ showPasteBtn: true, copyableDate: date, defaultValue: this.props.value });
      }
    }

  }

  componentWillReceiveProps(props) {
    let timeRef = props.value || hoursFrom(new Date(), 1);
    this.setState({
      defaultValue: props.value,
      hours: String(timeRef[getDateMethod(props.local, 'getHours')]()),
      minutes: (timeRef[getDateMethod(props.local, 'getMinutes')]() < 10 ? '0' : '') + String(timeRef[getDateMethod(props.local, 'getMinutes')]()),
    });
  }

  changeHours(e) {
    let hoursString = e.target.value;
    if (hoursString === '') {
      return this.setState({ hours: '' });
    }
    if (isNaN(hoursString)) {
      return;
    }
    let hours = parseInt(hoursString, 10);
    if (hours < 0) {
      hours = 0;
    }
    if (hours > 23) {
      hours = 23;
    }
    this.setState({ hours: String(hours) });
  }

  changeMinutes(e) {
    let minutesString = e.target.value;
    if (minutesString === '') {
      return this.setState({ minutes: '' });
    }
    if (isNaN(minutesString)) {
      return;
    }
    let minutes = parseInt(minutesString, 10);
    if (minutes < 0) {
      minutes = 0;
    }
    if (minutes > 59) {
      minutes = 59;
    }
    this.setState({ minutes: String(minutes) });
  }

  commitTime() {
    let dateRef = this.state.defaultValue || new Date();
    let newDate = this.props.local ? new Date(
      dateRef.getFullYear(),
      dateRef.getMonth(),
      dateRef.getDate(),
      parseInt(this.state.hours, 10),
      parseInt(this.state.minutes, 10)
    ) :
    new Date(Date.UTC(
      dateRef.getUTCFullYear(),
      dateRef.getUTCMonth(),
      dateRef.getUTCDate(),
      parseInt(this.state.hours, 10),
      parseInt(this.state.minutes, 10)
    ));
    this.props.onChange(newDate);
    if (this.props.close) {
      this.props.close();
    }
  }

  render() {
    return (
      <div style={{ width: this.props.width }} className={styles.picker} onClick={(e) => e.stopPropagation()} >
        <Calendar local={this.props.local} value={this.state.defaultValue || this.props.value} onChange={(newValue) => {
          let timeRef = this.state.defaultValue || hoursFrom(new Date(), 1);
          let newDate = this.props.local ? new Date(
            newValue.getFullYear(),
            newValue.getMonth(),
            newValue.getDate(),
            timeRef.getHours(),
            timeRef.getMinutes()
          ) :
          new Date(Date.UTC(
            newValue.getUTCFullYear(),
            newValue.getUTCMonth(),
            newValue.getUTCDate(),
            timeRef.getUTCHours(),
            timeRef.getUTCMinutes()
          ));
          this.props.onChange(newDate);
        }} />
        <div className={styles.time}>
          <div style={{float: 'left'}}>
            <input type='text' value={this.state.hours} onChange={this.changeHours.bind(this)} />
            <span> : </span>
            <input type='text' value={this.state.minutes} onChange={this.changeMinutes.bind(this)} />
          </div>
          <Button value='Set time' onClick={this.commitTime.bind(this)} primary={true} />
          {
            this.state.showPasteBtn === true &&
              <div>
                <div style={{ height: '5px' }}></div>
              <Button width="100%" borderRadius="0px" value='Paste from clipboard'
              onClick={() => {
                this.setState({ defaultValue: new Date(this.state.copyableDate) });
                this.props.onChange(new Date(this.state.copyableDate));
              }} primary={true} />
              </div>}
        </div>
      </div>
    );
  }
}

DateTimePicker.propTypes = {
  value: PropTypes.instanceOf(Date).describe(
    'The current date of the picker.'
  ),
  width: PropTypes.number.isRequired.describe(
    'The width of the calendar.'
  ),
  onChange: PropTypes.func.isRequired.describe(
    'A function to call when a new date is selected.'
  ),
  close: PropTypes.func.describe(
    'An optional function to call to close the calendar.'
  ),
  local: PropTypes.bool.describe(
    'An option flag to set when using a local DateTimeInput.'
  ),
};
