import { debounce } from 'lodash';
import React, { useMemo } from 'react';
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

export const QueryEditor = (props: Props) => {
  const { onRunQuery } = props;
  const debouncedRunQuery = useMemo(() => debounce(onRunQuery, 500), [onRunQuery]);

  const prependDashboardVariables = (data: ComboboxOption[]) => {
    getTemplateSrv()
      .getVariables()
      .forEach((v, i) => {
        data.unshift({
          label: '/^$' + v.name + '$/',
          value: '/^$' + v.name + '$/',
        });
      });
    return data;
  };

  const loadHosts = (filter?: string): Promise<ComboboxOption[]> => {
    // hosts api is not able to filter on server side
    return lastValueFrom(props.datasource.request('GET', '/index.php/api/hosts'))
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
  };

  const loadServices = (filter: string): Promise<ComboboxOption[]> => {
    return lastValueFrom(
      props.datasource.request('POST', '/index.php/api/services', {
        host: props.datasource._replaceRegexWithAll(props.query.host) || '/.*/',
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
  };

  const loadLabel = (filter: string): Promise<ComboboxOption[]> => {
    return lastValueFrom(
      props.datasource.request('POST', '/index.php/api/labels', {
        host: props.datasource._replaceRegexWithAll(props.query.host) || '/.*/',
        service: props.datasource._replaceRegexWithAll(props.query.service) || '/.*/',
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
  };

  const onValueChange = (key: keyof PNPQuery, value: any) => {
    props.query[key] = value as never;
    props.onChange(props.query);
    debouncedRunQuery();
  };

  return (
    <>
      <div className="gf-form">
        <SegmentSection label="Select" fill={false}>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width={6} className="">
              Host:
            </InlineLabel>
            <Combobox
              value={props.query.host || ''}
              options={loadHosts}
              onChange={(v) => {
                if (v === null) {
                  v = { value: '' };
                }
                onValueChange('host', v.value);
              }}
              createCustomValue={true}
              width={28}
              isClearable={true}
            />
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width="auto" className="">
              Service:
            </InlineLabel>
            <Combobox
              key={props.query.host}
              value={props.query.service || ''}
              options={loadServices}
              onChange={(v) => {
                if (v === null) {
                  v = { value: '' };
                }
                onValueChange('service', v.value);
              }}
              createCustomValue={true}
              width={28}
              isClearable={true}
            />
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width="auto" className="">
              Label:
            </InlineLabel>
            <Combobox
              key={props.query.host + ';' + props.query.service}
              value={props.query.perflabel || ''}
              options={loadLabel}
              onChange={(v) => {
                if (v === null) {
                  v = { value: '' };
                }
                onValueChange('perflabel', v.value);
              }}
              createCustomValue={true}
              width={28}
              isClearable={true}
            />
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width="auto" className="">
              Type:
            </InlineLabel>
            <div className="">
              <Combobox
                options={[
                  { value: 'AVERAGE' },
                  { value: 'MIN' },
                  { value: 'MAX' },
                  { value: 'WARNING' },
                  { value: 'CRITICAL' },
                ]}
                onChange={(v) => {
                  onValueChange('type', v.value);
                }}
                value={props.query.type || 'AVERAGE'}
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>
      <div className="gf-form">
        <SegmentSection label="Options" fill={false}>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width={6} className="">
              Fill:
            </InlineLabel>
            <div className="">
              <Combobox
                options={[{ value: 'fill' }, { value: 'zero' }, { value: 'gap' }]}
                onChange={(v) => {
                  onValueChange('fill', v.value);
                }}
                value={props.query.fill || 'fill'}
                width={9}
              />
            </div>
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width={8} className="">
              Factor:
            </InlineLabel>
            <div className="">
              <Input
                id="123"
                defaultValue={''}
                width={36}
                onChange={(v) => {
                  onValueChange('factor', v.currentTarget.value);
                }}
                value={props.query.factor}
                placeholder="Factor, ex.: 0.1, 1024, 1/1024"
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>
      <div className="gf-form">
        <SegmentSection label="Alias" fill={false}>
          <InlineSegmentGroup grow={true}>
            <div className="">
              <Input
                id="456"
                defaultValue={''}
                width={60}
                onChange={(v) => {
                  onValueChange('alias', v.currentTarget.value);
                }}
                placeholder="Naming pattern, ex.: $tag_host, $tag_service, $tag_label"
                value={props.query.alias}
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>
    </>
  );
};
