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

  const { datasource , query, onChange } = props

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
  };

  const loadServices = (filter: string): Promise<ComboboxOption[]> => {
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
  };

  const loadLabel = (filter: string): Promise<ComboboxOption[]> => {
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
  };

  const onValueChange = (key: keyof PNPQuery, value: any) => {
    const newQuery = {
      ...query,
      [key] : value as never
    }
    onChange(newQuery);
    debouncedRunQuery();
  };

  return (
    <>
      <div className="gf-form">

        <SegmentSection
          fill={false}
          label="Select"
        >
          <InlineSegmentGroup
            grow={true}
          >

            <InlineLabel
              className=""
              width={6}
            >
              "Host:"
            </InlineLabel>

            <Combobox
              createCustomValue={true}
              isClearable={true}
              onChange={(v) => {
                if (v === null) {
                  v = { value: '' };
                }
                onValueChange('host', v.value);
              }}
              options={loadHosts}
              value={props.query.host || ''}
              width={28}
            />

          </InlineSegmentGroup>

          <InlineSegmentGroup grow={true}>
            <InlineLabel className="" width="auto">
              Service:
            </InlineLabel>
            <Combobox
              createCustomValue={true}
              isClearable={true}
              key={props.query.host}
              onChange={(v) => {
                if (v === null) {
                  v = { value: '' };
                }
                onValueChange('service', v.value);
              }}
              options={loadServices}
              value={props.query.service || ''}
              width={28}
            />
          </InlineSegmentGroup>

          <InlineSegmentGroup
            grow={true}
          >
            <InlineLabel className="" width="auto">
              Label:
            </InlineLabel>

            <Combobox
              createCustomValue={true}
              isClearable={true}
              key={props.query.host + ';' + props.query.service}
              onChange={(v) => {
                if (v === null) {
                  v = { value: '' };
                }
                onValueChange('perflabel', v.value);
              }}
              options={loadLabel}
              value={props.query.perflabel || ''}
              width={28}
            />
          </InlineSegmentGroup>

          <InlineSegmentGroup
            grow={true}
          >
            <InlineLabel className="" width="auto">
              Type:
            </InlineLabel>

            <div className="">
              <Combobox
                onChange={(v) => {
                  onValueChange('type', v.value);
                }}
                options={[
                  { value: 'AVERAGE' },
                  { value: 'MIN' },
                  { value: 'MAX' },
                  { value: 'WARNING' },
                  { value: 'CRITICAL' },
                ]}
                value={props.query.type || 'AVERAGE'}
              />
            </div>

          </InlineSegmentGroup>
        </SegmentSection>
      </div>

      <div
        className="gf-form"
      >

        <SegmentSection
          fill={false}
          label="Options"
        >

          <InlineSegmentGroup
            grow={true}
          >
            <InlineLabel
              className=""
              width={6}
            >
              Fill:
            </InlineLabel>

            <div className="">
              <Combobox
                onChange={(v) => {
                  onValueChange('fill', v.value);
                }}
                options={[{ value: 'fill' }, { value: 'zero' }, { value: 'gap' }]}
                value={props.query.fill || 'fill'}
                width={9}
              />
            </div>
          </InlineSegmentGroup>

          <InlineSegmentGroup
            grow={true}
          >
            <InlineLabel
              className=""
              width={8}
            >
              Factor:
            </InlineLabel>

            <div className="">
              <Input
                defaultValue={''}
                id="123"
                onChange={(v) => {
                  onValueChange('factor', v.currentTarget.value);
                }}
                placeholder="Factor, ex.: 0.1, 1024, 1/1024"
                value={props.query.factor}
                width={36}
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>

      <div
        className="gf-form"
      >
        <SegmentSection
          fill={false}
          label="Alias"
        >
          <InlineSegmentGroup
            grow={true}
          >
            <div className="">

              <Input
                defaultValue={''}
                id="456"
                onChange={(v) => {
                  onValueChange('alias', v.currentTarget.value);
                }}
                placeholder="Naming pattern, ex.: $tag_host, $tag_service, $tag_label"
                value={props.query.alias}
                width={60}
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>
    </>
  );
}
