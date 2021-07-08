/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Button from 'components/Button/Button.react';
import keyMirror from 'lib/keyMirror';
import PropTypes from 'lib/PropTypes';
import React from 'react';
import { shake } from 'components/SaveButton/SaveButton.scss';

let SaveButton = ({
  state = SaveButton.States.WAITING,
  onClick,
  waitingText = 'Save changes',
  savingText = 'Saving\u2026',
  failedText = 'Save failed',
  succeededText = 'Saved!',
  disabled = false,
  ...buttonProps
}) => {
  let value = '';
  let color = 'blue';
  switch (state) {
    case SaveButton.States.WAITING:
      value = waitingText;
      break;
    case SaveButton.States.SAVING:
      value = savingText;
      break;
    case SaveButton.States.SUCCEEDED:
      value = succeededText;
      color = 'green';
      break;
    case SaveButton.States.FAILED:
      value = failedText;
      color = 'red';
      break;
  }
  let className = state === SaveButton.States.FAILED ? shake : null;
  return <span className={className}><Button
    primary={true}
    width={'128px'}
    progress={state === SaveButton.States.SAVING}
    color={color}
    onClick={state === SaveButton.States.WAITING ? onClick : null}
    value={value}
    disabled={state === SaveButton.States.WAITING ? disabled : false}
    {...buttonProps}/>
  </span>;
};

SaveButton.States = keyMirror(['SAVING', 'SUCCEEDED', 'FAILED', 'WAITING']);

let {...forwardedButtonProps} = Button.propTypes;
delete forwardedButtonProps.value;
SaveButton.propTypes = {
  state: PropTypes.string.describe('SaveButton.States.(SAVING|SUCCEEDED|FAILED|WAITING). Defaults to WAITING.'),
  onClick: PropTypes.func.describe('Click handler. Actived if button is clicked while enabled and in WAITING state.'),
  waitingText: PropTypes.string.describe('Text for WAITING state. Defaults to "Save changes".'),
  savingText: PropTypes.string.describe('Text for SAVING state. Defaults to "Saving\u2025".'),
  failedText: PropTypes.string.describe('Text for FAILED state. Defaults to "Save failed".'),
  succeededText: PropTypes.string.describe('Text for SUCCEEDED state. Defaults to "Saved!".'),
  disabled: PropTypes.bool.describe('Disables button if in WAITING state.'),
  ...forwardedButtonProps,
};

export default SaveButton;
