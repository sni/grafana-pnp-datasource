import { debounce } from 'lodash';
import React from 'react';
import { lastValueFrom } from 'rxjs';
import { InlineSegmentGroup, SegmentSection, InlineLabel, Combobox, Input, ComboboxOption } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { DataSource } from './datasource';
import { PNPDataSourceOptions, PNPQuery } from './types';

type Props = QueryEditorProps<DataSource, PNPQuery, PNPDataSourceOptions>;

export function toSelectableValue<T extends string>(t: T): SelectableValue<T> {
  return { label: t, value: t };
}

export function QueryEditor(props: Props) {
  const { onRunQuery } = props;
  const debouncedRunQuery = React.useMemo(() => debounce(onRunQuery, 500), [onRunQuery]);

  const { datasource, query, onChange } = props;

  const prependDashboardVariables = React.useCallback((data: ComboboxOption[]) => {
    getTemplateSrv()
      .getVariables()
      .forEach((v, i) => {
        data.unshift({
          label: '/^$' + v.name + '$/',
          value: '/^$' + v.name + '$/',
        });
      });
    return data;
  }, []);

  const loadHosts = React.useCallback(
    (filter?: string): Promise<ComboboxOption[]> => {
      // hosts api is not able to filter on server side
      return lastValueFrom(datasource.request('GET', '/index.php/api/hosts'))
        .then((response) => {
          // empty response is an array instead of a hashmap
          if (Array.isArray(response.data)) {
            return [];
          }
          return response.data.hosts.map((row: { name?: string }) => {
            return { label: row.name, value: row.name };
          });
        })
        .then(prependDashboardVariables)
        .then((data) =>
          data.filter((item) => {
            return (
              !filter ||
              (item &&
                (item.value.toLowerCase().includes(filter.toLowerCase()) ||
                  item.label?.toLowerCase().includes(filter.toLowerCase())))
            );
          })
        );
    },
    [datasource, prependDashboardVariables]
  );

  const loadServices = React.useCallback(
    (filter: string): Promise<ComboboxOption[]> => {
      return lastValueFrom(
        datasource.request('POST', '/index.php/api/services', {
          host: datasource._replaceRegexWithAll(query.host) || '/.*/',
        })
      )
        .then((response) => {
          // empty response is an array instead of a hashmap
          if (Array.isArray(response.data)) {
            return [];
          }
          return response.data.services.map((row: { name?: string; servicedesc?: string }) => {
            return { label: row.servicedesc || row.name, value: row.name };
          });
        })
        .then(prependDashboardVariables)
        .then((data) =>
          data.filter((item) => {
            return (
              !filter ||
              (item &&
                (item.value.toLowerCase().includes(filter.toLowerCase()) ||
                  item.label?.toLowerCase().includes(filter.toLowerCase())))
            );
          })
        );
    },
    [datasource, prependDashboardVariables, query.host]
  );

  const loadLabel = React.useCallback(
    (filter: string): Promise<ComboboxOption[]> => {
      return lastValueFrom(
        datasource.request('POST', '/index.php/api/labels', {
          host: datasource._replaceRegexWithAll(query.host) || '/.*/',
          service: datasource._replaceRegexWithAll(query.service) || '/.*/',
        })
      )
        .then((response) => {
          // empty response is an array instead of a hashmap
          if (Array.isArray(response.data)) {
            return [];
          }
          return response.data.labels.map((row: { name?: string; label?: string }) => {
            return { label: row.label || row.name, value: row.label || row.name };
          });
        })
        .then(prependDashboardVariables)
        .then((data) =>
          data.filter((item) => {
            return (
              !filter ||
              (item &&
                (item.value.toLowerCase().includes(filter.toLowerCase()) ||
                  item.label?.toLowerCase().includes(filter.toLowerCase())))
            );
          })
        );
    },
    [datasource, query.host, query.service, prependDashboardVariables]
  );

  const onValueChange = React.useCallback(
    (key: keyof PNPQuery, value: any) => {
      const newQuery = {
        ...query,
        [key]: value as never,
      };
      onChange(newQuery);
      debouncedRunQuery();
    },
    [debouncedRunQuery, onChange, query]
  );

  const onHostChange = React.useCallback(
    (v: ComboboxOption<string> | null) => {
      let value = '';
      if (v !== null) {
        value = v.value;
      }
      onValueChange('host' as keyof PNPQuery, value);
    },
    [onValueChange]
  );

  const onServiceChange = React.useCallback(
    (v: ComboboxOption<string> | null) => {
      let value = '';
      if (v !== null) {
        value = v.value;
      }
      onValueChange('service', value);
    },
    [onValueChange]
  );

  const onPerflabelChange = React.useCallback(
    (v: ComboboxOption<string> | null) => {
      let value = '';
      if (v !== null) {
        value = v.value;
      }
      onValueChange('perflabel', value);
    },
    [onValueChange]
  );

  const onTypeChange = React.useCallback(
    (v: ComboboxOption<string> | null) => {
      let value = '';
      if (v !== null) {
        value = v.value;
      }
      onValueChange('type', value);
    },
    [onValueChange]
  );

  const onFillChange = React.useCallback(
    (v: ComboboxOption<string> | null) => {
      let value = '';
      if (v !== null) {
        value = v.value;
      }
      onValueChange('fill', value);
    },
    [onValueChange]
  );

  const onFactorChange = React.useCallback(
    (v: React.ChangeEvent<HTMLInputElement, Element>) => {
      onValueChange('fill', v.currentTarget.value);
    },
    [onValueChange]
  );

  const onAliasChange = React.useCallback(
    (v: React.ChangeEvent<HTMLInputElement, Element>) => {
      onValueChange('alias', v.currentTarget.value);
    },
    [onValueChange]
  );

  return (
    <>
      <div className="gf-form">
        <SegmentSection fill={false} label="Select">
          <InlineSegmentGroup grow={true}>
            <InlineLabel className="" width={7}>
              {'Host:'}
            </InlineLabel>

            <Combobox
              createCustomValue={true}
              isClearable={true}
              onChange={onHostChange}
              options={loadHosts}
              value={query.host || ''}
              width={28}
            />
          </InlineSegmentGroup>

          <InlineSegmentGroup grow={true}>
            <InlineLabel className="" width={7}>
              {'Service:'}
            </InlineLabel>
            <Combobox
              createCustomValue={true}
              isClearable={true}
              key={query.host}
              onChange={onServiceChange}
              options={loadServices}
              value={query.service || ''}
              width={28}
            />
          </InlineSegmentGroup>
        </SegmentSection>
      </div>

      <div className="gf-form">
        <SegmentSection fill={false} label=" ">
          <InlineSegmentGroup grow={true}>
            <InlineLabel className="" width={7}>
              {'Label:'}
            </InlineLabel>

            <Combobox
              createCustomValue={true}
              isClearable={true}
              key={query.host + ';' + query.service}
              onChange={onPerflabelChange}
              options={loadLabel}
              value={query.perflabel || ''}
              width={28}
            />
          </InlineSegmentGroup>

          <InlineSegmentGroup grow={true}>
            <InlineLabel className="" width={7}>
              {'Type:'}
            </InlineLabel>

            <div className="">
              <Combobox
                onChange={onTypeChange}
                options={[
                  { value: 'AVERAGE' },
                  { value: 'MIN' },
                  { value: 'MAX' },
                  { value: 'WARNING' },
                  { value: 'CRITICAL' },
                ]}
                value={query.type || 'AVERAGE'}
                width={28}
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>

      <div className="gf-form">
        <SegmentSection fill={false} label="Options">
          <InlineSegmentGroup grow={true}>
            <InlineLabel className="" width={6}>
              {'Fill:'}
            </InlineLabel>

            <div className="">
              <Combobox
                onChange={onFillChange}
                options={[{ value: 'fill' }, { value: 'zero' }, { value: 'gap' }]}
                value={query.fill || 'fill'}
                width={9}
              />
            </div>
          </InlineSegmentGroup>

          <InlineSegmentGroup grow={true}>
            <InlineLabel className="" width={8}>
              {'Factor:'}
            </InlineLabel>

            <div className="">
              <Input
                defaultValue={''}
                id="123"
                onChange={onFactorChange}
                placeholder="Factor, ex.: 0.1, 1024, 1/1024"
                value={query.factor}
                width={36}
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>

      <div className="gf-form">
        <SegmentSection fill={false} label="Alias">
          <InlineSegmentGroup grow={true}>
            <div className="">
              <Input
                defaultValue={''}
                id="456"
                onChange={onAliasChange}
                placeholder="Naming pattern, ex.: $tag_host, $tag_service, $tag_label"
                value={query.alias}
                width={60}
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>
    </>
  );
}
