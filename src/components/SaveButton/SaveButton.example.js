/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React  from 'react';
import SaveButton from 'components/SaveButton/SaveButton.react';

export const component = SaveButton;

class SaveDemo extends React.Component {
  constructor() {
    super();

    this.state = {
      saveState: SaveButton.States.WAITING,
      nextState: SaveButton.States.SUCCEEDED,
    };
  }

  handleClick() {
    this.setState({ saveState: SaveButton.States.SAVING });
    setTimeout(() => {
      let next = this.state.nextState === SaveButton.States.SUCCEEDED ?
        SaveButton.States.FAILED :
        SaveButton.States.SUCCEEDED;
      this.setState({ saveState: this.state.nextState, nextState: next });

      setTimeout(() => {
        this.setState({ saveState: SaveButton.States.WAITING });
      }, 2000);
    }, 3000);
  }

  render() {
    return <SaveButton state={this.state.saveState} onClick={this.handleClick.bind(this)} />;
  }
}

export const demos = [
  {
    render: () => (
      <div>
        <div style={{padding: 10}}>
          <SaveButton />
        </div>
        <div style={{padding: 10}}>
          <SaveButton state={SaveButton.States.SAVING} />
        </div>
        <div style={{padding: 10}}>
          <SaveButton state={SaveButton.States.SUCCEEDED} />
        </div>
        <div style={{padding: 10}}>
          <SaveButton state={SaveButton.States.FAILED} />
        </div>
        <div style={{padding: 10}}>
          <SaveButton state={SaveButton.States.WAITING} />
        </div>
      </div>
    )
  }, {
    name: 'Clickable demo',
    render: () => <SaveDemo />
  }
];
