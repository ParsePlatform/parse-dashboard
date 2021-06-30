/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Button       from 'components/Button/Button.react';
import Field        from 'components/Field/Field.react';
import Icon         from 'components/Icon/Icon.react';
import Popover      from 'components/Popover/Popover.react';
import Position     from 'lib/Position';
import React        from 'react';
import PropTypes    from 'lib/PropTypes';
import styles       from 'components/Modal/Modal.scss';

let origin = new Position(0, 0);
let buttonColors = {
  danger: 'red',
  info: 'blue',
  valid: 'green'
};

let Modal = (({
  type = Modal.Types.INFO,
  icon,
  iconSize = 36,
  children,
  title,
  subtitle,
  cancelText = 'Cancel',
  onCancel,
  canCancel = true,
  showCancel = true,
  confirmText = 'Okay',
  onConfirm,
  disabled = false,
  progress = false,
  customFooter,
  textModal = false,
  width,
  continueText,
  onContinue,
  showContinue,
  buttonsInCenter = React.Children.count(children) === 0,
}) => {
  if (children) {
    children = React.Children.map(children, (c) => {
      if (c && c.type === Field && c.props.label) {
        return React.cloneElement(c, { ...c.props, labelPadding: 24 });
      }
      return c;
    });
  }

  let footer = customFooter || (
    <div style={{textAlign: buttonsInCenter ? 'center' : 'right'}} className={styles.footer}>
      {showCancel ? <Button
        value={cancelText}
        onClick={onCancel}
        disabled={!canCancel} /> : null}
      <Button
        primary={true}
        value={confirmText}
        color={buttonColors[type]}
        disabled={!!disabled}
        onClick={onConfirm}
        progress={progress} />
      {
      showContinue === true ?
      <Button
        primary={true}
        value={continueText}
        color={buttonColors[type]}
        disabled={!!disabled}
        onClick={onContinue}
        progress={progress} />: null}
    </div>
  );

  let wrappedChildren = textModal ? <div className={styles.textModal}>
    {children}
  </div> : children;

  return (
    <Popover fadeIn={true} fixed={true} position={origin} modal={true} color='rgba(17,13,17,0.8)'>
      <div className={[styles.modal, styles[type]].join(' ')} style={{ width }}>
        <div className={styles.header}>
          <div style={{top: React.Children.count(subtitle) === 0 ? '37px' : '25px'}} className={styles.title}>{title}</div>
          <div className={styles.subtitle}>{subtitle}</div>
          {icon ?
            <div className={styles.icon}>
              <Icon width={iconSize} height={iconSize} name={icon} fill='#ffffff' />
            </div> : null}
        </div>
        {wrappedChildren}
        {footer}
      </div>
    </Popover>
  );
});

Modal.Types = {
  DANGER: 'danger',
  INFO: 'info',
  VALID: 'valid'
};

Modal.propTypes = {
  type: PropTypes.string.describe('Used to change the color of the modal and buttons. Use Modal.Types.DANGER, Modal.Types.INFO, or Modal.Types.VALID.'),
  icon: PropTypes.string.describe('The Icon to display in the top right corner.'),
  iconSize: PropTypes.number.describe('The size of the Icon in the top right corner.'),
  title: PropTypes.string.isRequired.describe('The title of the modal.'),
  subtitle: PropTypes.node.describe('The subtitle of the modal. Usually a string or <span>.'),
  cancelText: PropTypes.string.describe('String for the cancel button. Defaults to "Cancel".'),
  onCancel: PropTypes.func.describe('Called when the cancel button is clicked.'),
  canCancel: PropTypes.bool.describe('Determines whether this modal can be cancelled. Defaults to true. Useful to prevent the user from attempting to cancel a modal when a related request is in-flight.'),
  showCancel: PropTypes.bool.describe('Determines whether to show the cancel button. Defaults to true.'),
  confirmText: PropTypes.string.describe('String for the confirm button. Defaults to "Okay".'),
  onConfirm: PropTypes.func.describe('Called when the confirm button is clicked.'),
  disabled: PropTypes.bool.describe('If true, the confirm button will be disabled.'),
  progress: PropTypes.bool.describe('Passed to the confirm button.'),
  customFooter: PropTypes.node.describe('used to fill any custom footer use case.'),
  textModal: PropTypes.bool.describe('Used for modals that contain only text to pad the text.'),
  width: PropTypes.number.describe('custom width of modal.'),
  buttonsInCenter: PropTypes.bool.describe('If true, the buttons will appear in the center of the modal, instead of to the right. By default, the buttons appear on the right unless the modal contains no children, in which case they appear in the center.'),
};

export default Modal;
