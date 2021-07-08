/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import CodeEditor from 'components/CodeEditor/CodeEditor.react';
import DashboardView from 'dashboard/DashboardView.react';
import EmptyState    from 'components/EmptyState/EmptyState.react';
import FileTree      from 'components/FileTree/FileTree.react';
import history       from 'dashboard/history';
import React         from 'react';
import styles        from 'dashboard/Data/CloudCode/CloudCode.scss';
import Toolbar       from 'components/Toolbar/Toolbar.react';
import SaveButton from 'components/SaveButton/SaveButton.react';

function getPath(params) {
  const last = params.location.pathname.split('cloud_code/')[1]
  return last;
}

export default class CloudCode extends DashboardView {
  constructor() {
    super();
    this.section = 'Core';
    this.subsection = 'Cloud Code';

    this.state = {
      files: undefined,
      source: undefined,
      saveState: SaveButton.States.WAITING,
      saveError: '',
    };
  }

  componentWillMount() {
    this.fetchSource(this.context.currentApp, getPath(this.props));
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (this.context !== nextContext) {
      this.fetchSource(nextContext.currentApp, getPath(nextProps));
    }
  }

  fetchSource(app, fileName) {
    app.getLatestRelease().then(
      (release) => {
        this.setState({ files: release.files, source: undefined });

        if (!release.files || Object.keys(release.files).length === 0) {
          // Releases is empty. Show EmptyState
          return;
        }

        if (!fileName || release.files[fileName] === undefined) {
          // Means we're still in /cloud_code/. Let's redirect to /cloud_code/main.js
          history.replace(this.context.generatePath(`cloud_code/${Object.keys(release.files)[0]}`))
        } else {
          // Means we can load /cloud_code/<fileName>
          this.setState({ source: undefined })
          app.getSource(fileName).then(
            (source) => {
              this.setState({ source: source })
              if (this.editor) {
                this.editor.value = source;
              }
            },
            () => this.setState({ source: undefined })
          );
        }
      },
      () => this.setState({ files: undefined, source: undefined })
    );
  }

  renderSidebar() {
    let current = getPath(this.props) || '';
    let files = this.state.files;
    if (!files) {
      return null;
    }
    let paths = [];
    for (let key in files) {
      paths.push(key);
    }
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ borderLeft: '1px solid #3e87b2' }}>
          <FileTree
            linkPrefix={this.context.generatePath('cloud_code/')}
            current={current}
            files={paths} />
        </div>
      </div>
    );
  }
  async getCode() { 
    if (!this.editor) {
      return;
    }
    this.setState({ saveState: SaveButton.States.SAVING });
    let fileName = getPath(this.props);
    try {
      await this.context.currentApp.saveSource(fileName,this.editor.value);
      this.setState({ saveState: SaveButton.States.SUCCEEDED });
      setTimeout(()=> {
        this.setState({ saveState: SaveButton.States.WAITING });
      },2000);
    } catch (e) {
      this.setState({ saveState: SaveButton.States.FAILED });
      this.setState({ saveError: e.message || e });
    }
  }
  renderContent() {
    let toolbar = null;
    let content = null;
    let fileName = getPath(this.props);

    if (!this.state.files || Object.keys(this.state.files).length === 0) {
      content = (
        <div className={styles.empty}>
          <EmptyState
            title={'You haven\u2019t deployed any code yet.'}
            icon='folder-outline'
            description={'When you deploy your cloud code, you\u2019ll be able to see your files here'}
            cta='Get started with Cloud Code'
            action={() => window.location = 'http://docs.parseplatform.org/cloudcode/guide'} />
        </div>
      );
    } else {
      if (fileName) {
        toolbar = <Toolbar
          section='Cloud Code'
          subsection={fileName} />;

        let source = this.state.files[fileName];
        if ((source && source.source) || this.state.source) {
          content = (
            <div className={styles.content}>
              <CodeEditor
                placeHolder={this.state.source || source.source}
                ref={editor => (this.editor = editor)}
                fontSize={'14px'}
              />
               <SaveButton 
               state={this.state.saveState}
               waitingText={this.state.submitText}
               savingText={this.state.inProgressText}
               failedText={this.state.saveError}
               onClick={() => this.getCode(this)}></SaveButton>
            </div>
          );
        }
      }
    }

    return (
      <div className={styles.source}>
        {content}
        {toolbar}
      </div>
    );
  }
}
