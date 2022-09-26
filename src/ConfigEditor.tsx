import React, { PureComponent } from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { PNPDataSourceOptions } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<PNPDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  render() {
    const { onOptionsChange, options } = this.props;
    if(!options.jsonData.keepCookies) {
      options.jsonData.keepCookies = ['thruk_auth', 'pnp4nagios'];
    }
    return (
      <div className="gf-form-group">
        <>
          <DataSourceHttpSettings
            defaultUrl={'http://127.0.0.1/pnp4nagios'}
            dataSourceConfig={options}
            showAccessOptions={false}
            onChange={onOptionsChange}
          />
        </>
      </div>
    );
  }
}
