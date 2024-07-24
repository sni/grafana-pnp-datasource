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

  const prependDashboardVariables = (data: SelectableValue[]) => {
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

  const loadHosts = (filter?: string): Promise<SelectableValue[]> => {
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
      .then(prependDashboardVariables);
  };

  const loadServices = (filter: string): Promise<SelectableValue[]> => {
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
      .then(prependDashboardVariables);
  };

  const loadLabel = (filter: string): Promise<SelectableValue[]> => {
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
      .then(prependDashboardVariables);
  };

  const onValueChange = (key: keyof PNPQuery, value: any) => {
    props.query[key] = value as never;
    props.onChange(props.query);
    debouncedRunQuery();
  };

  // set input field value and emit changed event
  const inputTypeValue = (inp: HTMLInputElement, value: string) => {
    // special cases for select * and "+" button
    if (!value) {
      value = '';
    }
    let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (!nativeInputValueSetter) {
      inp.value = value;
      return;
    }
    nativeInputValueSetter.call(inp, value);

    const event = new Event('input', { bubbles: true });
    inp.dispatchEvent(event);
  };

  let lastInput: HTMLInputElement;
  // set current value so it can be changed instead of typing it again
  const makeInputEditable = (value: string, inp?: HTMLInputElement) => {
    if (inp) {
      lastInput = inp;
    } else {
      inp = lastInput;
    }
    if (!inp) {
      return;
    }
    inputTypeValue(inp, value);
    setTimeout(() => {
      if (!inp) {
        return;
      }
      inputTypeValue(inp, value);
    }, 200);
  };

  const handleHostFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (props.query.host) {
      makeInputEditable(props.query.host, e.target as HTMLInputElement);
    }
  };

  const handleServiceFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (props.query.service) {
      makeInputEditable(props.query.service, e.target as HTMLInputElement);
    }
  };

  const handlePerflabelFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (props.query.perflabel) {
      makeInputEditable(props.query.perflabel, e.target as HTMLInputElement);
    }
  };

  /*Implicitly blurs all elements so that onFoucs function can be
    called again for input fields which therefore keep the value inside when being clicked*/
  function blurAll() {
    let tmp = document.createElement('input');
    document.body.appendChild(tmp);
    tmp.focus();
    document.body.removeChild(tmp);
  }

  return (
    <>
      <div className="gf-form">
        <SegmentSection label="Select" fill={false}>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width={6} className="">
              Host:
            </InlineLabel>
            <div className={selectClass}>
              <AsyncSelect
                defaultOptions
                value={toSelectableValue(props.query.host || '')}
                loadOptions={loadHosts}
                onChange={(v) => {
                  if (v === null) {
                    v = { value: '' };
                  }
                  console.log('Changed value to: ' + v);
                  onValueChange('host', v.value);
                  blurAll();
                }}
                noOptionsMessage="No hosts found"
                allowCustomValue={true}
                filterOption={filterOptions}
                width={28}
                isClearable={true}
                createOptionPosition="first"
                onFocus={handleHostFocus as () => void}
              />
            </div>
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width="auto" className="">
              Service:
            </InlineLabel>
            <div className={selectClass}>
              <AsyncSelect
                key={props.query.host}
                defaultOptions
                value={toSelectableValue(props.query.service || '')}
                loadOptions={loadServices}
                onChange={(v) => {
                  if (v === null) {
                    v = { value: '' };
                  }
                  onValueChange('service', v.value);
                  blurAll();
                }}
                noOptionsMessage="No services found"
                allowCustomValue={true}
                openMenuOnFocus={true}
                cacheOptions={false}
                filterOption={filterOptions}
                width={28}
                isClearable={true}
                createOptionPosition="first"
                allowCreateWhileLoading
                onFocus={handleServiceFocus as unknown as () => void}
              />
            </div>
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width="auto" className="">
              Label:
            </InlineLabel>
            <div className={selectClass}>
              <AsyncSelect
                key={props.query.host + ';' + props.query.service}
                defaultOptions
                value={toSelectableValue(props.query.perflabel || '')}
                loadOptions={loadLabel}
                onChange={(v) => {
                  if (v === null) {
                    v = { value: '' };
                  }
                  onValueChange('perflabel', v.value);
                  blurAll();
                }}
                noOptionsMessage="No performance label found"
                allowCustomValue={true}
                openMenuOnFocus={true}
                filterOption={filterOptions}
                width={28}
                isClearable={true}
                createOptionPosition="first"
                allowCreateWhileLoading
                onFocus={handlePerflabelFocus as unknown as () => void}
              />
            </div>
          </InlineSegmentGroup>
          <InlineSegmentGroup grow={true}>
            <InlineLabel width="auto" className="">
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
            <InlineLabel width={6} className="">
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
