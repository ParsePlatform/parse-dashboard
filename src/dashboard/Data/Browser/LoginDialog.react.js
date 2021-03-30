import React from 'react';
import ParseApp from 'lib/ParseApp';
import PropTypes from 'prop-types';
import Modal from 'components/Modal/Modal.react';
import LoginRow from 'components/LoginRow/LoginRow.react';
import Notification from 'dashboard/Data/Browser/Notification.react';

export default class LoginDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      username: '',
      password: ''
    };

    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.login = this.login.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  handleOpen() {
    this.setState({ open: true });
  }

  handleClose() {
    this.setState({ username: '', password: '', open: false });
  }

  async login() {
    const { username, password } = this.state;
    if (!!username && !!password) {
      try {
        await this.props.login(username, password);
        this.handleClose();
      } catch (error) {
        this.setState({ error: error.message });
        setTimeout(() => {
          this.setState({ error: null });
        }, 3500);
      }
    }
  }

  handleKeyDown(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      this.login();
    }
  }

  render() {
    const { currentUser } = this.props;
    const { open } = this.state;

    return (
      open && (
        <Modal
          type={Modal.Types.INFO}
          title={currentUser ? 'Switch User' : 'Browse as User'}
          subtitle={
            <div style={{ paddingTop: '5px' }}>
              {currentUser && (
                <p>
                  Browsing as <strong>{currentUser.get('username')}</strong>
                </p>
              )}
            </div>
          }
          onCancel={this.handleClose}
          onConfirm={this.login}
          confirmText="Browse"
          cancelText="Cancel"
        >
          <LoginRow
            label="Username"
            input={
              <input
                onChange={e =>
                  this.setState({ username: e.nativeEvent.target.value })
                }
                onKeyDown={this.handleKeyDown}
                autoFocus
              />
            }
          />
          <LoginRow
            label="Password"
            input={
              <input
                onChange={e =>
                  this.setState({ password: e.nativeEvent.target.value })
                }
                type="password"
                onKeyDown={this.handleKeyDown}
              />
            }
          />
          <Notification note={this.state.error} isErrorNote={true} />
        </Modal>
      )
    );
  }
}

LoginDialog.contextTypes = {
  currentApp: PropTypes.instanceOf(ParseApp)
};
