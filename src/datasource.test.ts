import { DataSource } from 'datasource';
import { getTemplateSrv } from '@grafana/runtime';
import { DataFrame, DataQueryRequest, dateTime } from '@grafana/data';
import { PNPQuery } from './types';
import { of, throwError } from 'rxjs';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getTemplateSrv: jest.fn(),
}));

const mockTemplateSrv = () => {
  (getTemplateSrv as jest.Mock).mockReturnValue({
    replace: (str: string) => str,
    getVariables: () => [],
  });
};

const range = { from: dateTime(1700000000000), to: dateTime(1700003600000) };

describe('query', () => {
  beforeEach(mockTemplateSrv);

  test('builds a frame per series and applies factor and fill', async () => {
    const ds = new DataSource({} as any);
    jest.spyOn(ds, 'request').mockResolvedValue({
      data: {
        targets: [
          [
            {
              host: 'h1',
              service: 's1',
              perflabel: 'load',
              // datapoints are [value, time]; trailing null is dropped, remaining null is filled
              datapoints: [
                [1, 1000],
                [null, 2000],
                [2, 3000],
                [null, 4000],
              ],
            },
          ],
        ],
      },
    });
    const result = await ds.query({
      targets: [{ refId: 'A', host: 'h1', service: 's1', perflabel: 'load', factor: 2, fill: 'zero' }],
      range,
    } as unknown as DataQueryRequest<PNPQuery>);

    expect(result.data).toHaveLength(1);
    const frame = result.data[0] as DataFrame;
    expect(frame.refId).toBe('A');
    expect(frame.fields[1].name).toBe('load');
    expect(frame.fields[0].values).toEqual([1000, 2000, 3000]);
    expect(frame.fields[1].values).toEqual([2, 0, 4]);
  });

  test('applies the alias pattern using tag variables', async () => {
    (getTemplateSrv as jest.Mock).mockReturnValue({
      replace: (str: string, scopedVars?: any) => {
        if (!scopedVars) {
          return str;
        }
        return str.replace(/\$(tag_\w+)/g, (_m, name: string) => String(scopedVars[name]?.value));
      },
      getVariables: () => [],
    });
    const ds = new DataSource({} as any);
    jest.spyOn(ds, 'request').mockResolvedValue({
      data: {
        targets: [[{ host: 'h1', service: 's1', perflabel: 'load', datapoints: [[1000, 1]] }]],
      },
    });
    const result = await ds.query({
      targets: [{ refId: 'A', host: 'h1', service: 's1', perflabel: 'load', alias: '$tag_host:$tag_label' }],
      range,
    } as unknown as DataQueryRequest<PNPQuery>);

    expect((result.data[0] as DataFrame).fields[1].name).toBe('h1:load');
  });

  test('does not mutate the shared target objects', async () => {
    const target: any = { refId: 'A', host: 'h1', service: 's1', perflabel: 'load' };
    const before = { ...target };
    const ds = new DataSource({} as any);
    jest.spyOn(ds, 'request').mockResolvedValue({ data: { targets: [[]] } });
    await ds.query({ targets: [target], range } as unknown as DataQueryRequest<PNPQuery>);
    expect(target).toEqual(before);
  });

  test('sends range as start/end seconds and applies the default type', async () => {
    const ds = new DataSource({} as any);
    const request = jest.spyOn(ds, 'request').mockResolvedValue({ data: { targets: [[]] } });
    await ds.query({
      targets: [{ refId: 'A', host: 'h1', service: 's1', perflabel: 'load' }],
      range,
    } as unknown as DataQueryRequest<PNPQuery>);

    expect(request).toHaveBeenCalledWith(
      'POST',
      '/index.php/api/metrics',
      expect.objectContaining({
        start: '1700000000',
        end: '1700000300',
        targets: [expect.objectContaining({ type: 'AVERAGE' })],
      }),
      { 'Content-Type': 'application/json' }
    );
  });
});

describe('request', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('extracts useful details from an HTTP HTML error', async () => {
    const ds = new DataSource({} as any);
    jest.spyOn(ds, '_request').mockReturnValue(
      throwError(() => ({
        status: 502,
        statusText: 'Bad Gateway',
        data: { response: '<html><h1>PNP unavailable</h1></html>', message: 'Proxy failed' },
      }))
    );
    await expect(ds.request('GET', '/index.php/api')).rejects.toThrow('502 Bad Gateway (PNP unavailable) Proxy failed');
  });

  test('reports pnp JSON errors', async () => {
    const ds = new DataSource({} as any);
    jest.spyOn(ds, '_request').mockReturnValue(of({ data: { error: 'no such host: foo' } }));
    await expect(ds.request('GET', '/index.php/api')).rejects.toThrow('no such host: foo');
  });

  test('rejects when browser access mode is used', async () => {
    const ds = new DataSource({ access: 'browser' } as any);
    await expect(ds.request('GET', '/index.php/api')).rejects.toThrow('Browser access mode');
  });
});

describe('_replaceRegexWithAll', () => {
  beforeEach(mockTemplateSrv);

  const ds = new DataSource({} as any);

  test('returns an empty string for undefined', () => {
    expect(ds._replaceRegexWithAll(undefined)).toBe('');
  });

  test('escapes a single value', () => {
    (getTemplateSrv as jest.Mock).mockReturnValue({
      replace: (str: string, _scopedVars: any, fn: (v: any) => any) => fn('host.example'),
      getVariables: () => [],
    });
    expect(ds._replaceRegexWithAll('$host')).toBe('host\\.example');
  });

  test('expands multiple values into a regex alternation', () => {
    (getTemplateSrv as jest.Mock).mockReturnValue({
      replace: (str: string, _scopedVars: any, fn: (v: any) => any) => fn(['a.example', 'b.example']),
      getVariables: () => [],
    });
    expect(ds._replaceRegexWithAll('$host')).toBe('(a\\.example|b\\.example)');
  });

  test('keeps the all-value .* as is', () => {
    (getTemplateSrv as jest.Mock).mockReturnValue({
      replace: (str: string, _scopedVars: any, fn: (v: any) => any) => fn('.*'),
      getVariables: () => [],
    });
    expect(ds._replaceRegexWithAll('$host')).toBe('.*');
  });
});

describe('metricFindQuery', () => {
  beforeEach(mockTemplateSrv);

  test('rejects unknown query types', async () => {
    const ds = new DataSource({} as any);
    await expect(ds.metricFindQuery('bogus')).rejects.toThrow('unknown query type');
  });

  test('rejects a missing where clause', async () => {
    const ds = new DataSource({} as any);
    await expect(ds.metricFindQuery('host = localhost')).rejects.toThrow('query syntax error, expecting WHERE');
  });

  test('parses where filters and maps hosts', async () => {
    const ds = new DataSource({} as any);
    const request = jest.spyOn(ds, 'request').mockResolvedValue({ data: { hosts: [{ name: 'host1' }] } });
    const result = await ds.metricFindQuery('host where host = foo and service = bar');

    expect(request).toHaveBeenCalledWith('POST', '/index.php/api/hosts', { host: 'foo', service: 'bar' });
    expect(result).toEqual([{ text: 'host1', value: 'host1' }]);
  });

  test('maps services using the service description', async () => {
    const ds = new DataSource({} as any);
    jest.spyOn(ds, 'request').mockResolvedValue({
      data: { services: [{ name: 'Ping', servicedesc: 'Ping localhost' }] },
    });
    const result = await ds.metricFindQuery('service where host = localhost');
    expect(result).toEqual([{ text: 'Ping localhost', value: 'Ping localhost' }]);
  });
});
