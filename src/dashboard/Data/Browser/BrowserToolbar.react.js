/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import BrowserFilter        from 'components/BrowserFilter/BrowserFilter.react';
import BrowserMenu          from 'components/BrowserMenu/BrowserMenu.react';
import Icon                 from 'components/Icon/Icon.react';
import MenuItem             from 'components/BrowserMenu/MenuItem.react';
import prettyNumber         from 'lib/prettyNumber';
import React, { useRef }    from 'react';
import Separator            from 'components/BrowserMenu/Separator.react';
import styles               from 'dashboard/Data/Browser/Browser.scss';
import Toolbar              from 'components/Toolbar/Toolbar.react';
import SecurityDialog       from 'dashboard/Data/Browser/SecurityDialog.react';
import ColumnsConfiguration  from 'components/ColumnsConfiguration/ColumnsConfiguration.react';
import SecureFieldsDialog   from 'dashboard/Data/Browser/SecureFieldsDialog.react';
import LoginDialog          from 'dashboard/Data/Browser/LoginDialog.react';
import Toggle               from 'components/Toggle/Toggle.react';

let BrowserToolbar = ({
  className,
  classNameForEditors,
  count,
  perms,
  schema,
  filters,
  selection,
  relation,
  setCurrent,
  onFilterChange,
  onAddColumn,
  onAddRow,
  onAddRowWithModal,
  onAddClass,
  onEditSelectedRow,
  onAttachRows,
  onAttachSelectedRows,
  onCloneSelectedRows,
  onExport,
  onRemoveColumn,
  onDeleteRows,
  onDropClass,
  onChangeCLP,
  onRefresh,
  onEditPermissions,
  hidePerms,
  isUnique,
  uniqueField,
  handleColumnDragDrop,
  handleColumnsOrder,
  order,

  enableDeleteAllRows,
  enableExportClass,
  enableSecurityDialog,

  enableColumnManipulation,
  enableClassManipulation,

  currentUser,
  useMasterKey,
  login,
  logout,
  toggleMasterKeyUsage,
}) => {
  let selectionLength = Object.keys(selection).length;
  let details = [];
  if (count !== undefined) {
      if (count === 1) {
        details.push('1 object');
      } else {
        details.push(prettyNumber(count) + ' objects');
      }
  }

  if (!relation && !isUnique) {
    if (perms && !hidePerms) {
      let read = perms.get && perms.find && perms.get['*'] && perms.find['*'];
      let write = perms.create && perms.update && perms.delete && perms.create['*'] && perms.update['*'] && perms.delete['*'];
      if (read && write) {
        details.push('Public Read and Write enabled');
      } else if (read) {
        details.push('Public Read enabled');
      } else if (write) {
        details.push('Public Write enabled');
      }
    }
  }
  let menu = null;
  if (relation) {
    menu = (
      <BrowserMenu title='Edit' icon='edit-solid' setCurrent={setCurrent}>
        <MenuItem
          text={`Create ${relation.targetClassName} and attach`}
          onClick={onAddRow}
        />
        <MenuItem
          text="Attach existing row"
          onClick={onAttachRows}
        />
        <Separator />
        <MenuItem
          disabled={selectionLength === 0}
          text={selectionLength === 1 && !selection['*'] ? 'Detach this row' : 'Detach these rows'}
          onClick={() => onDeleteRows(selection)}
        />
      </BrowserMenu>
    );
  } else if (onAddRow) {
    menu = (
      <BrowserMenu title='Edit' icon='edit-solid' disabled={isUnique} setCurrent={setCurrent}>
        <MenuItem text='Add a row' onClick={onAddRow} />
        <MenuItem text='Add a row with modal' onClick={onAddRowWithModal} />
        {enableColumnManipulation ? <MenuItem text='Add a column' onClick={onAddColumn} /> : <noscript />}
        {enableClassManipulation ? <MenuItem text='Add a class' onClick={onAddClass} /> : <noscript />}
        <Separator />
        <MenuItem
          disabled={selectionLength !== 1}
          text={'Edit this row with modal'}
          onClick={onEditSelectedRow}
        />
        <Separator />
        <MenuItem
          disabled={!selectionLength}
          text={`Attach ${selectionLength <= 1 ? 'this row' : 'these rows'} to relation`}
          onClick={onAttachSelectedRows}
        />
        <Separator />
        <MenuItem
          disabled={!selectionLength}
          text={`Clone ${selectionLength <= 1 ? 'this row' : 'these rows'}`}
          onClick={onCloneSelectedRows}
        />
        <Separator />
        <MenuItem
          disabled={selectionLength === 0}
          text={selectionLength === 1 && !selection['*'] ? 'Delete this row' : 'Delete these rows'}
          onClick={() => onDeleteRows(selection)} />
        {enableColumnManipulation ? <MenuItem text='Delete a column' onClick={onRemoveColumn} /> : <noscript />}
        {enableDeleteAllRows ? <MenuItem text='Delete all rows' onClick={() => onDeleteRows({ '*': true })} /> : <noscript />}
        {enableClassManipulation ? <MenuItem text='Delete this class' onClick={onDropClass} /> : <noscript />}
        {enableExportClass ? <Separator /> : <noscript />}
        {enableExportClass ? <MenuItem text='Export this data' onClick={onExport} /> : <noscript />}
      </BrowserMenu>
    );
  }

  let subsection = className;
  if (relation) {
    subsection = `'${relation.key}' on ${relation.parent.id}`;
  } else if (subsection.length > 30) {
    subsection = subsection.substr(0, 30) + '\u2026';
  }
  const classes = [styles.toolbarButton];
  let onClick = onAddRow;
  if (isUnique) {
    classes.push(styles.toolbarButtonDisabled);
    onClick = null;
  }

  const columns = {};
  const userPointers = [];
  const schemaSimplifiedData = {};
  const classSchema = schema.data.get('classes').get(classNameForEditors);
  if (classSchema) {
    classSchema.forEach(({ type, targetClass }, col) => {
      schemaSimplifiedData[col] = {
        type,
        targetClass,
      };

      columns[col] = { type, targetClass };

      if (col === 'objectId' || isUnique && col !== uniqueField) {
        return;
      }
      if ((type ==='Pointer' && targetClass === '_User') || type === 'Array' ) {
        userPointers.push(col);
      }
    });
  }

  let clpDialogRef = useRef(null);
  let protectedDialogRef = useRef(null);
  let loginDialogRef = useRef(null);

  const showCLP = ()=> clpDialogRef.current.handleOpen();
  const showProtected = () => protectedDialogRef.current.handleOpen();
  const showLogin = () => loginDialogRef.current.handleOpen();

  return (
    <Toolbar
      relation={relation}
      filters={filters}
      section={relation ? `Relation <${relation.targetClassName}>` : 'Class'}
      subsection={subsection}
      details={details.join(' \u2022 ')}
    >
      {onAddRow && (
        <a className={classes.join(' ')} onClick={onClick}>
          <Icon name="plus-solid" width={14} height={14} />
          <span>Add Row</span>
        </a>
      )}
      {onAddRow && <div className={styles.toolbarSeparator} />}
      <ColumnsConfiguration
        handleColumnsOrder={handleColumnsOrder}
        handleColumnDragDrop={handleColumnDragDrop}
        order={order}
      />
      <div className={styles.toolbarSeparator} />
      {onAddRow && (
        <LoginDialog
          ref={loginDialogRef}
          currentUser={currentUser}
          login={login}
          logout={logout}
        />
      )}
      {onAddRow && (
        <BrowserMenu
            setCurrent={setCurrent}
            title={currentUser ? 'Browsing' : 'Browse'}
            icon="users-solid"
            active={!!currentUser}
          >
            <MenuItem text={currentUser ? 'Switch User' : 'As User'} onClick={showLogin} />
            {currentUser ? <MenuItem text={<span>Use Master Key <Toggle type={Toggle.Types.HIDE_LABELS} value={useMasterKey} onChange={toggleMasterKeyUsage} switchNoMargin={true} additionalStyles={{ display: 'inline', lineHeight: 0, margin: 0, paddingLeft: 5 }} /></span>} onClick={toggleMasterKeyUsage} /> : <noscript />}
            {currentUser ? <MenuItem text={<span>Stop browsing (<b>{currentUser.get('username')}</b>)</span>} onClick={logout} /> : <noscript />}
        </BrowserMenu>
      )}
      {onAddRow && <div className={styles.toolbarSeparator} />}
      <a className={styles.toolbarButton} onClick={onRefresh}>
        <Icon name="refresh-solid" width={14} height={14} />
        <span>Refresh</span>
      </a>
      <div className={styles.toolbarSeparator} />
      <BrowserFilter
        setCurrent={setCurrent}
        schema={schemaSimplifiedData}
        filters={filters}
        onChange={onFilterChange}
        className={classNameForEditors}
        blacklistedFilters={onAddRow ? [] : ['unique']}
      />
      {onAddRow && <div className={styles.toolbarSeparator} />}
      {perms && enableSecurityDialog ? (
        <SecurityDialog
          ref={clpDialogRef}
          disabled={!!relation || !!isUnique}
          perms={perms}
          columns={columns}
          className={classNameForEditors}
          onChangeCLP={onChangeCLP}
          userPointers={userPointers}
          title="ClassLevelPermissions"
          icon="locked-solid"
          onEditPermissions={onEditPermissions}
        />
      ) : (
        <noscript />
      )}
      <SecureFieldsDialog
        ref={protectedDialogRef}
        columns={columns}
        disabled={!!relation || !!isUnique}
        perms={perms}
        className={classNameForEditors}
        onChangeCLP={onChangeCLP}
        userPointers={userPointers}
        title='ProtectedFields'
        icon='locked-solid'
        onEditPermissions={onEditPermissions}
      />
      {enableSecurityDialog ? (
        <BrowserMenu
          setCurrent={setCurrent}
          title="Security"
          icon="locked-solid"
          disabled={!!relation || !!isUnique}
        >
          <MenuItem text={'Class Level Permissions'} onClick={showCLP} />
          <MenuItem text={'Protected Fields'} onClick={showProtected} />
        </BrowserMenu>
      ) : (
        <noscript />
      )}
      {enableSecurityDialog ? (
        <div className={styles.toolbarSeparator} />
      ) : (
        <noscript />
      )}
      {menu}
    </Toolbar>
  );
};

export default BrowserToolbar;
