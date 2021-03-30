import React from 'react';
import { List } from 'immutable';
import Parse from 'parse';
import * as ColumnPreferences from 'lib/ColumnPreferences';
import queryFromFilters from 'lib/queryFromFilters';
import PropTypes from 'lib/PropTypes';
import ParseApp from 'lib/ParseApp';
import Modal from 'components/Modal/Modal.react';
import Button from 'components/Button/Button.react';
import TextInput from 'components/TextInput/TextInput.react';
import DataBrowser from 'dashboard/Data/Browser/DataBrowser.react';
import stylesBrowser from 'dashboard/Data/Browser/Browser.scss';
import stylesBrowserFilter from 'components/BrowserFilter/BrowserFilter.scss';
import stylesToolbar from 'components/Toolbar/Toolbar.scss';
import stylesColumnsConfiguration from 'components/ColumnsConfiguration/ColumnsConfiguration.scss';
import stylesDataBrowserHeaderBar from 'components/DataBrowserHeaderBar/DataBrowserHeaderBar.scss';
import stylesFooter from 'components/Modal/Modal.scss';

// The initial and max amount of rows fetched by lazy loading
const MAX_ROWS_FETCHED = 200;
const SELECTION_INPUT_ID = 'selectionInput';

export default class ObjectPickerDialog extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      data: null,
      counts: {},
      filteredCounts: {},
      filters: new List(),
      lastMax: -1,
      ordering: '-createdAt',
      selection: {},
      // initial relation ids -> currently saved in database
      initialRelationData: [],
      selectionInput: '',
      disableDataBrowserKeyControls: false
    };

    this.disableDataBrowserKeyControls = this.disableDataBrowserKeyControls.bind(
      this
    );
    this.fetchNextPage = this.fetchNextPage.bind(this);
    this.updateFilters = this.updateFilters.bind(this);
    this.refresh = this.refresh.bind(this);
    this.selectRow = this.selectRow.bind(this);
    this.updateSelectionFromInput = this.updateSelectionFromInput.bind(this);
    this.updateOrdering = this.updateOrdering.bind(this);
    this.onConfirm = this.onConfirm.bind(this);
  }

  async componentWillMount() {
    const { filters } = this.state;
    const { className, pointerId, relation } = this.props;
    await this.fetchData(className, filters);
    if (pointerId) {
      this.selectRow(pointerId, true);
    }
    if (relation) {
      this.selectRelationRows(relation, filters);
    }
    document
      .getElementById(SELECTION_INPUT_ID)
      .addEventListener('focus', this.disableDataBrowserKeyControls);
  }

  componentWillUnmount() {
    document
      .getElementById(SELECTION_INPUT_ID)
      .addEventListener('focus', this.disableDataBrowserKeyControls);
  }

  disableDataBrowserKeyControls() {
    this.setState({ disableDataBrowserKeyControls: true });
  }

  async selectRelationRows(relation, filters) {
    const relationData = await this.fetchParseData(relation, filters);
    this.setState({ initialRelationData: relationData });
    relationData.forEach(({ id }) => this.selectRow(id, true));
  }

  async fetchData(source, filters = new List()) {
    const data = await this.fetchParseData(source, filters);
    var filteredCounts = { ...this.state.filteredCounts };
    if (filters.size > 0) {
      filteredCounts[source] = await this.fetchParseDataCount(source, filters);
    } else {
      delete filteredCounts[source];
    }
    this.setState({
      data: data,
      filters,
      lastMax: MAX_ROWS_FETCHED,
      filteredCounts: filteredCounts
    });
  }

  async fetchParseData(source, filters) {
    const { useMasterKey } = this.props;
    const query = queryFromFilters(source, filters);
    const sortDir = this.state.ordering[0] === '-' ? '-' : '+';
    const field = this.state.ordering.substr(sortDir === '-' ? 1 : 0);

    if (sortDir === '-') {
      query.descending(field);
    } else {
      query.ascending(field);
    }

    query.limit(MAX_ROWS_FETCHED);

    let promise = query.find({ useMasterKey: useMasterKey });

    const data = await promise;
    return data;
  }

  async fetchParseDataCount(source, filters) {
    const query = queryFromFilters(source, filters);
    const { useMasterKey } = this.props;
    const count = await query.count({ useMasterKey: useMasterKey });
    return count;
  }

  fetchNextPage() {
    if (!this.state.data) {
      return null;
    }
    let className = this.props.className;
    let source = this.state.relation || className;
    let query = queryFromFilters(source, this.state.filters);
    if (this.state.ordering !== '-createdAt') {
      // Construct complex pagination query
      let equalityQuery = queryFromFilters(source, this.state.filters);
      let field = this.state.ordering;
      let ascending = true;
      let comp = this.state.data[this.state.data.length - 1].get(field);
      if (field === 'objectId' || field === '-objectId') {
        comp = this.state.data[this.state.data.length - 1].id;
      }
      if (field[0] === '-') {
        field = field.substr(1);
        query.lessThan(field, comp);
        ascending = false;
      } else {
        query.greaterThan(field, comp);
      }
      if (field === 'createdAt') {
        equalityQuery.greaterThan(
          'createdAt',
          this.state.data[this.state.data.length - 1].get('createdAt')
        );
      } else {
        equalityQuery.lessThan(
          'createdAt',
          this.state.data[this.state.data.length - 1].get('createdAt')
        );
        equalityQuery.equalTo(field, comp);
      }
      query = Parse.Query.or(query, equalityQuery);
      if (ascending) {
        query.ascending(this.state.ordering);
      } else {
        query.descending(this.state.ordering.substr(1));
      }
    } else {
      query.lessThan(
        'createdAt',
        this.state.data[this.state.data.length - 1].get('createdAt')
      );
      query.addDescending('createdAt');
    }
    query.limit(MAX_ROWS_FETCHED);

    const { useMasterKey } = this.props;
    query.find({ useMasterKey: useMasterKey }).then(nextPage => {
      if (className === this.props.className) {
        this.setState(state => ({
          data: state.data.concat(nextPage)
        }));
      }
    });
    this.setState({ lastMax: this.state.lastMax + MAX_ROWS_FETCHED });
  }

  async updateFilters(filters) {
    const { selection } = this.state;
    const { className } = this.props;
    await this.setState({
      filters: filters,
      selection: {}
    });
    await this.fetchData(className, filters);
    Object.keys(selection).forEach(id => this.selectRow(id, true));
  }

  async updateOrdering(ordering) {
    const { className } = this.props;
    const { filters, selection } = this.state;
    await this.setState({
      ordering: ordering,
      selection: {}
    });
    await this.fetchData(className, filters);
    Object.keys(selection).forEach(id => this.selectRow(id, true));
    ColumnPreferences.getColumnSort(
      ordering,
      this.context.currentApp.applicationId,
      className
    );
  }

  async refresh() {
    const { className } = this.props;
    const { filters, selection } = this.state;
    await this.setState({
      data: null,
      lastMax: -1,
      selection: {}
    });
    await this.fetchData(className, filters);
    Object.keys(selection).forEach(id => this.selectRow(id, true));
  }

  selectRow(id, checked) {
    const { column } = this.props;
    this.setState(({ selection, selectionInput }) => {
      if (checked) {
        if (column.type === 'Pointer') {
          selection = {};
        }
        selection[id] = true;
      } else {
        delete selection[id];
      }
      selectionInput = Object.keys(selection).join(', ');
      return { selection, selectionInput };
    });
  }

  updateSelectionFromInput(newValue) {
    const { column } = this.props;
    const isPointer = column.type === 'Pointer';
    const newSelection = {};
    newValue.split(', ').some(id => {
      if (id.length === 10) {
        newSelection[id] = true;
        if (isPointer) {
          this.setState({ selectionInput: id });
          return true;
        }
      }
    });
    this.setState({
      selection: newSelection,
      disableDataBrowserKeyControls: false
    });
  }

  onConfirm() {
    const { onConfirm, column } = this.props;
    const isRelation = column.type === 'Relation';
    const { selection, initialRelationData } = this.state;
    const currentSelection = Object.keys(selection);
    const newValue = isRelation
      ? currentSelection.filter(id => !initialRelationData.includes({ id }))
      : currentSelection;
    const toDelete = isRelation
      ? initialRelationData.filter(({ id }) => !currentSelection.includes(id))
      : undefined;
    onConfirm(newValue, toDelete);
  }

  render() {
    const { schema, column, className, onCancel } = this.props;
    const {
      data,
      counts,
      filteredCounts,
      filters,
      lastMax,
      ordering,
      selection,
      selectionInput,
      disableDataBrowserKeyControls
    } = this.state;

    const columns = { objectId: { type: 'String' } };
    const classes = schema.data.get('classes');
    classes.get(className).forEach(({ type, targetClass }, name) => {
      if (name === 'objectId') {
        return;
      }
      const info = { type };
      if (targetClass) {
        info.targetClass = targetClass;
      }
      columns[name] = info;
    });

    const count =
      className in filteredCounts
        ? filteredCounts[className]
        : counts[className];

    return (
      <Modal
        open
        type={Modal.Types.VALID}
        icon="edit-solid"
        iconSize={30}
        title={`Select ${column.name}`}
        subtitle={`${column.type} <${column.targetClass}>`}
        width={'80vw'}
        customFooter={
          <div style={{ textAlign: 'right' }} className={stylesFooter.footer}>
            <div className={stylesBrowser.selectionInputWrapper}>
              <TextInput
                id={SELECTION_INPUT_ID}
                monospace={true}
                height="30px"
                placeholder={
                  column.type === 'Relation'
                    ? 'ox0QZFl7eg, qs81Q72lTL, etc...'
                    : 'ox0QZFl7eg'
                }
                value={selectionInput}
                onChange={newValue =>
                  this.setState({
                    selectionInput: newValue,
                    disableDataBrowserKeyControls: true
                  })
                }
                onBlur={newValue => this.updateSelectionFromInput(newValue)}
              />
            </div>
            <Button value="Cancel" onClick={onCancel} />
            <Button
              primary={true}
              value={`Save ${column.type}`}
              color="green"
              onClick={this.onConfirm}
            />
          </div>
        }
      >
        <div
          className={[
            stylesBrowser.objectPickerContent,
            stylesBrowserFilter.objectPickerContent,
            stylesToolbar.objectPickerContent,
            stylesColumnsConfiguration.objectPickerContent,
            column.type === 'Pointer'
              ? stylesDataBrowserHeaderBar.pickerPointer
              : ''
          ].join(' ')}
        >
          <div className={stylesBrowser.selectionSection}>
            <div className={stylesBrowser.selectionHeader}>
              <p>selected</p>
            </div>
            <div className={stylesBrowser.selectionList}>
              {Object.keys(selection).map(id => {
                return (
                  <Button
                    key={id}
                    value={id}
                    color="red"
                    width="108px"
                    additionalStyles={{
                      height: '22px',
                      lineHeight: '22px',
                      padding: '0',
                      fontSize: '12px',
                      marginBottom: '9px',
                      fontFamily: 'Source Code Pro, Courier New, monospace'
                    }}
                    onClick={() => this.selectRow(id, false)}
                  />
                );
              })}
            </div>
          </div>
            <DataBrowser
              count={count}
              schema={schema}
              filters={filters}
              onFilterChange={this.updateFilters}
              onRefresh={this.refresh}
              columns={columns}
              className={className}
              fetchNextPage={this.fetchNextPage}
              maxFetched={lastMax}
              selectRow={this.selectRow}
              selection={selection}
              data={data}
              ordering={ordering}
              disableKeyControls={disableDataBrowserKeyControls}
              disableSecurityDialog={true}
              updateOrdering={this.updateOrdering}
            />
        </div>
      </Modal>
    );
  }
}

ObjectPickerDialog.contextTypes = {
  currentApp: PropTypes.instanceOf(ParseApp)
};
