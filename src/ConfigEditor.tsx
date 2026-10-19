import React from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { PNPDataSourceOptions } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<PNPDataSourceOptions> {}

interface State {}

export class ConfigEditor extends React.PureComponent<Props, State> {
  render() {
    const { onOptionsChange, options } = this.props;

    const optionsCopy = {
      ...options,
      jsonData: {
        ...options.jsonData,
        keepCookies: options.jsonData.keepCookies || ['thruk_auth', 'pnp4nagios'],
      },
    };

    return (
      <div>
        <>
          <DataSourceHttpSettings
            defaultUrl="http://127.0.0.1/pnp4nagios"
            dataSourceConfig={optionsCopy}
            showAccessOptions={false}
            onChange={onOptionsChange}
          />
        </>
      </div>
    );
  }
}
