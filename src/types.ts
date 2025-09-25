import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface PNPQuery extends DataQuery {
  host?: string;
  service?: string;
  perflabel?: string;
  type?: string;
  fill?: string;
  factor?: string | number;
  alias?: string;
}

export const defaultQuery: Partial<PNPQuery> = {
  type: 'AVERAGE',
  fill: 'fill',
  factor: 1,
};

export interface PNPDataSourceOptions extends DataSourceJsonData {
  keepCookies?: string[];
}
