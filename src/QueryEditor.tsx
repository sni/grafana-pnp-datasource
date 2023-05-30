import { debounce } from 'lodash';
import { css } from '@emotion/css';
import React, { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { InlineSegmentGroup, SegmentSection, InlineLabel, AsyncSelect, Select, Input } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { DataSource } from './datasource';
import { PNPDataSourceOptions, PNPQuery } from './types';

type Props = QueryEditorProps<DataSource, PNPQuery, PNPDataSourceOptions>;

const selectClass = css({
  minWidth: '160px',
});

export function toSelectableValue<T extends string>(t: T): SelectableValue<T> {
  return { label: t, value: t };
}

function filterOptions(option: SelectableValue, search: string) {
  if (option.value === search) {
    return true;
  }
  try {
    if (String(option.value).match(RegExp(search, 'i'))) {
      return true;
    }
  } catch (e) {
    console.warn(e);
  }
  return false;
}

export const QueryEditor = (props: Props) => {
  const { onRunQuery } = props;
  const debouncedRunQuery = useMemo(() => debounce(onRunQuery, 500), [onRunQuery]);

  const prependDasboardVariables = (data: SelectableValue[]) => {
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

  const loadHosts = (filter: string): Promise<SelectableValue[]> => {
    // hosts api is not able to filter on server side
    return lastValueFrom(props.datasource.request('GET', '/index.php/api/hosts'))
      .then((response) => {
        // empty response is an array instead of a hashmap
        if(Array.isArray(response.data)) {
          return([]);
        }
        return response.data.hosts.map((row: { name?: string }) => {
          return { label: row.name, value: row.name };
        });
      })
      .then(prependDasboardVariables);
  };

  const loadServices = (filter: string): Promise<SelectableValue[]> => {
    return lastValueFrom(
      props.datasource.request('POST', '/index.php/api/services', { host: props.query.host || '/.*/' })
    )
      .then((response) => {
        // empty response is an array instead of a hashmap
        if(Array.isArray(response.data)) {
          return([]);
        }
        return response.data.services.map((row: { name?: string; servicedesc?: string }) => {
          return { label: row.servicedesc || row.name, value: row.name };
        });
      })
      .then(prependDasboardVariables);
  };

  const loadLabel = (filter: string): Promise<SelectableValue[]> => {
    return lastValueFrom(
      props.datasource.request('POST', '/index.php/api/labels', {
        host: props.query.host || '/.*/',
        service: props.query.service || '/.*/',
      })
    )
      .then((response) => {
        // empty response is an array instead of a hashmap
        if(Array.isArray(response.data)) {
          return([]);
        }
        return response.data.labels.map((row: { name?: string; label?: string }) => {
          return { label: row.label || row.name, value: row.label || row.name };
        });
      })
      .then(prependDasboardVariables);
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
            <InlineLabel htmlFor="" width={6} className="">
              Host:
            </InlineLabel>
            <div className={selectClass}>
              <AsyncSelect
                defaultOptions
                value={toSelectableValue(props.query.host || '')}
                loadOptions={loadHosts}
                onChange={(v) => {
                  if(v === null) { v = {value: ""} }
                  onValueChange('host', v.value);
                }}
                noOptionsMessage="No hosts found"
                allowCustomValue={true}
                openMenuOnFocus={true}
                filterOption={filterOptions}
                width={28}
                isClearable={true}
              />
            </div>
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel htmlFor="" width="auto" className="">
              Service:
            </InlineLabel>
            <div className={selectClass}>
              <AsyncSelect
                key={props.query.host}
                defaultOptions
                value={toSelectableValue(props.query.service || '')}
                loadOptions={loadServices}
                onChange={(v) => {
                  if(v === null) { v = {value: ""} }
                  onValueChange('service', v.value);
                }}
                noOptionsMessage="No services found"
                allowCustomValue={true}
                openMenuOnFocus={true}
                cacheOptions={false}
                filterOption={filterOptions}
                width={28}
                isClearable={true}
              />
            </div>
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel htmlFor="" width="auto" className="">
              Label:
            </InlineLabel>
            <div className={selectClass}>
              <AsyncSelect
                key={props.query.host + ';' + props.query.service}
                defaultOptions
                value={toSelectableValue(props.query.perflabel || '')}
                loadOptions={loadLabel}
                onChange={(v) => {
                  if(v === null) { v = {value: ""} }
                  onValueChange('perflabel', v.value);
                }}
                noOptionsMessage="No performance label found"
                allowCustomValue={true}
                openMenuOnFocus={true}
                filterOption={filterOptions}
                width={28}
                isClearable={true}
              />
            </div>
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel htmlFor="" width="auto" className="">
              Type:
            </InlineLabel>
            <div className="">
              <Select
                options={['AVERAGE', 'MIN', 'MAX', 'WARNING', 'CRITICAL'].map(toSelectableValue)}
                onChange={(v) => {
                  onValueChange('type', v.value);
                }}
                value={toSelectableValue(props.query.type || 'AVERAGE')}
              />
            </div>
          </InlineSegmentGroup>
        </SegmentSection>
      </div>
      <div className="gf-form">
        <SegmentSection label="Options" fill={false}>
          <InlineSegmentGroup grow={true}>
            <InlineLabel htmlFor="" width={6} className="">
              Fill:
            </InlineLabel>
            <div className="">
              <Select
                options={['fill', 'zero', 'gap'].map(toSelectableValue)}
                onChange={(v) => {
                  onValueChange('fill', v.value);
                }}
                value={toSelectableValue(props.query.fill || 'fill')}
                width={9}
              />
            </div>
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel htmlFor="" width={8} className="">
              Factor:
            </InlineLabel>
            <div className="">
              <Input
                defaultValue={''}
                width={36}
                onChange={(v) => {
                  onValueChange('factor', v.currentTarget.value);
                }}
                label="Factor:"
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
