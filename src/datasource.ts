import defaults from 'lodash/defaults';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataQueryResponseData,
  DataSourceApi,
  DataSourceInstanceSettings,
  MetricFindValue,
  MutableDataFrame,
  FieldType,
  ScopedVars,
} from '@grafana/data';
import { BackendSrvRequest, getBackendSrv, toDataQueryResponse, getTemplateSrv } from '@grafana/runtime';
import { lastValueFrom, Observable, throwError } from 'rxjs';

import { PNPQuery, PNPDataSourceOptions, defaultQuery } from './types';
import { escapeRegExp } from 'lodash';

export class DataSource extends DataSourceApi<PNPQuery, PNPDataSourceOptions> {
  url?: string;
  basicAuth?: string;
  withCredentials?: boolean;
  isProxyAccess: boolean;

  constructor(instanceSettings: DataSourceInstanceSettings<PNPDataSourceOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.url;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
    this.isProxyAccess = instanceSettings.access === 'proxy';
  }

  async query(options: DataQueryRequest<PNPQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    const templateSrv = getTemplateSrv();

    // apply defaults on a copy so the shared targets are not mutated
    let targets = options.targets.map((target) => {
      const t = defaults({}, target, defaultQuery);
      t.alias = templateSrv.replace(t.alias, options.scopedVars);
      t.host = this._replaceRegexWithAll(t.host, options.scopedVars);
      t.service = this._replaceRegexWithAll(t.service, options.scopedVars);
      t.perflabel = this._replaceRegexWithAll(t.perflabel, options.scopedVars);
      t.fill = templateSrv.replace(t.fill, options.scopedVars);
      t.factor = templateSrv.replace(String(t.factor || ''), options.scopedVars);
      return t;
    });

    targets = targets.filter((t) => !t.hide);
    targets = targets.filter((t) => t.host); /* hide queries without a host filter */
    targets = targets.filter((t) => t.service); /* hide queries without a service filter */
    targets = targets.filter((t) => t.perflabel); /* hide queries without a perflabel filter */

    if (targets.length <= 0) {
      return toDataQueryResponse({});
    }

    // the pnp api reads the query parameters from the targets in the request body
    const queryOptions = {
      ...options,
      targets,
      start: Number(from / 1000).toFixed(),
      end: Number(to / 1000).toFixed(),
    };

    const result = await this.request('POST', '/index.php/api/metrics', queryOptions, {
      'Content-Type': 'application/json',
    });

    const data = [] as DataQueryResponseData[];

    for (let x = 0; x < result.data.targets.length; x++) {
      const target = targets[x];
      const query = defaults(target, defaultQuery);
      for (let k = 0; k < result.data.targets[x].length; k++) {
        const res = result.data.targets[x][k];
        let alias = res.perflabel;
        if (target.alias) {
          alias = target.alias;
          const scopedVars: ScopedVars = {
            tag_host: { text: 'tag_host', value: res.host },
            tag_service: { text: 'tag_service', value: res.service },
            tag_perflabel: { text: 'tag_perflabel', value: res.perflabel },
            tag_label: { text: 'tag_label', value: res.perflabel },
          };
          alias = templateSrv.replace(alias, scopedVars);
        }
        const frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'Time', type: FieldType.time },
            { name: alias, type: FieldType.number },
          ],
        });

        let datapoints = res.datapoints;
        let length = datapoints.length;

        // remove the last few "null" values from the series because the last value is quite often null
        // and would break current value in legend tables
        for (let y = 1; y < 5; y++) {
          if (length > y && datapoints[length - y][0] === null) {
            datapoints.pop();
          } else {
            break;
          }
        }

        length = datapoints.length;
        let fill = targets[x].fill;
        if (fill !== 'fill') {
          let fillWith = 0 as any;
          if (fill === 'zero') {
            fillWith = 0;
          }
          if (fill === 'gap') {
            fillWith = undefined;
          }
          for (let y = 0; y < length; y++) {
            if (datapoints[y][0] === null) {
              datapoints[y][0] = fillWith;
            }
          }
        }

        if (targets[x].factor && targets[x].factor !== '') {
          const factor = Number(Function('return(' + String(targets[x].factor) + ')')());
          if (factor !== 1 && !isNaN(factor)) {
            for (let y = 0; y < length; y++) {
              if (datapoints[y][0] !== null) {
                datapoints[y][0] *= factor;
              }
            }
          }
        }

        datapoints.forEach((row: [number, number]) => {
          frame.appendRow([row[1], row[0]]);
        });
        data.push(frame);
      }
    }

    return { data };
  }

  /* called from the dashboard templating engine to fill template variables
   * parses simple statements into proper data requests
   * query syntax: <type> [where <expr>]
   * ex.: host
   * ex.: service where host = localhost
   * ex.: label where host = localhost and service = ping
   */
  async metricFindQuery(query_string: string, options?: any): Promise<MetricFindValue[]> {
    if (query_string === '') {
      return [];
    }

    let query = query_string.split(/\s+/);

    if (query.length === 0) {
      return [];
    }

    let type = query[0].replace(/s$/, '');
    query.shift();

    // parse simple where statements
    let query_params: Record<string, any> = {};
    if (query[0] !== undefined) {
      if (query[0].toLowerCase() !== 'where') {
        throw new Error('query syntax error, expecting WHERE');
      }
      query.shift();

      while (query.length >= 3) {
        let op = query[1];
        if (op !== '=') {
          throw new Error("query syntax error, operator must be '='");
        }

        query_params[query[0].toLocaleLowerCase()] = getTemplateSrv().replace(query[2], undefined, 'regex');
        query.splice(0, 3); // shift 3 elements

        if (query[0] !== undefined) {
          if (query[0].toLowerCase() === 'and') {
            query.shift();
          } else {
            throw new Error('query syntax error, expecting AND');
          }
        }
      }

      // still remaining filters?
      if (query.length > 0) {
        throw new Error('query syntax error');
      }
    }

    if (type === 'host') {
      const response = await this.request('POST', '/index.php/api/hosts', query_params);
      if (!response || !response.data || !response.data.hosts) {
        return [];
      }
      return response.data.hosts.map((row: { name?: string }) => {
        return { text: row.name, value: row.name };
      });
    }
    if (type === 'service') {
      const response = await this.request('POST', '/index.php/api/services', query_params);
      if (!response || !response.data || !response.data.services) {
        return [];
      }
      return response.data.services.map((row: { name?: string; servicedesc?: string }) => {
        return { text: row.servicedesc || row.name, value: row.servicedesc || row.name };
      });
    }
    if (type === 'label') {
      const response = await this.request('POST', '/index.php/api/labels', query_params);
      if (!response || !response.data || !response.data.labels) {
        return [];
      }
      return response.data.labels.map((row: { name?: string; label?: string }) => {
        return { text: row.label || row.name, value: row.label || row.name };
      });
    }

    throw new Error('unknown query type, select one of host, service or label');
  }

  async testDatasource() {
    const response = await this.request('GET', '/index.php/api').catch((err) => {
      return { status: 'error', message: 'Datasource error: ' + err.message };
    });
    if (response.status === 'error') {
      return response;
    }
    if (response.status === 200 && response.data.pnp_version) {
      return {
        status: 'success',
        message: 'Successfully connected to PNP v' + response.data.pnp_version,
      };
    }
    return { status: 'error', message: 'invalid url, did not find pnp version in response.' };
  }

  async request(method: string, url: string, data?: any, headers?: BackendSrvRequest['headers']): Promise<any> {
    try {
      const result = await lastValueFrom(this._request(method, url, data, headers));

      // pass through pnp errors
      if (result.data && result.data.error) {
        throw new Error(result.data.error);
      }
      return result;
    } catch (error: unknown) {
      console.warn('failed to fetch ' + url);
      console.warn(error);
      if (typeof error === 'string') {
        throw new Error(error);
      }
      if (error instanceof Error) {
        throw error;
      }

      const httpError = error as { status: number; statusText: string; data?: any };
      if (httpError.status) {
        let extra = '';
        if (httpError.data) {
          if (httpError.data.response) {
            const matches = httpError.data.response.match(/<h1>(.*?)<\/h1>/);
            if (matches && matches[1] && matches[1] !== httpError.statusText) {
              extra = ' (' + matches[1] + ')';
            }
          }
          if (
            httpError.data.message &&
            httpError.data.message !== httpError.data.response &&
            httpError.data.message !== httpError.statusText
          ) {
            extra += ' ' + httpError.data.message;
          }
          if (httpError.data.description) {
            extra += ' (' + httpError.data.description + ')';
          }
        }
        throw new Error(httpError.status + ' ' + httpError.statusText + extra);
      }

      throw new Error('failed to fetch data, unknown error');
    }
  }

  _request(method: string, url: string, data?: any, headers?: BackendSrvRequest['headers']): Observable<any> {
    if (!this.isProxyAccess) {
      return throwError(
        () =>
          new Error('Browser access mode in the PNP datasource is no longer available. Switch to server access mode.')
      );
    }

    const options: BackendSrvRequest = {
      url: this.url + url,
      method,
      data,
      headers,
    };

    if (this.basicAuth || this.withCredentials) {
      options.withCredentials = true;
    }
    if (this.basicAuth) {
      options.headers = {
        Authorization: this.basicAuth,
      };
    }

    return getBackendSrv().fetch<any>(options);
  }

  _replaceRegexWithAll(value: string | undefined, scopedVars?: ScopedVars): string {
    if (value === undefined) {
      return '';
    }

    const replacer = (value: string | string[]): string => {
      if (typeof value === 'string') {
        if (value === '.*') {
          return value;
        }
        return escapeRegExp(value);
      }
      if (value.length === 0) {
        return '';
      }
      if (value.length === 1) {
        return escapeRegExp(value[0]);
      }
      let parts: string[] = [];
      value.forEach((v) => {
        parts.push(escapeRegExp(v));
      });
      return '(' + parts.join('|') + ')';
    };

    const templateSrv = getTemplateSrv();
    const scopedAllVars: ScopedVars = scopedVars || {};
    templateSrv.getVariables().forEach((tplVal: any) => {
      if (tplVal.multi && tplVal.includeAll && tplVal.current.text.length === 1 && tplVal.current.text[0] === 'All') {
        scopedAllVars[tplVal.name] = { text: tplVal.name, value: '.*' };
      }
    });

    return templateSrv.replace(value, scopedAllVars, replacer);
  }
}
