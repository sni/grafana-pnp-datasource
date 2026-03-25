import React from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { PNPDataSourceOptions } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<PNPDataSourceOptions> {}

export function ConfigEditor({ onOptionsChange, options }: Props) {
  const optionsCopy = {
    ...options,
    jsonData: {
      ...options.jsonData,
      keepCookies: options.jsonData.keepCookies || ['thruk_auth', 'pnp4nagios']
    }
  };

  return (
    <div className="gf-form-group">
      <DataSourceHttpSettings
        dataSourceConfig={optionsCopy}
        defaultUrl='http://127.0.0.1/pnp4nagios'
        onChange={onOptionsChange}
        showAccessOptions={false}
      />
    </div>
  );
}
