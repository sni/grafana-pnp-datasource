import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
  }

  /* fetch pnp rrd data */
  query(options) {
    var query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);

    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    query.start = Number(options.range.from.toDate().getTime() / 1000).toFixed();
    query.end   = Number(options.range.to.toDate().getTime() / 1000).toFixed();

    /* fixup regex syntax in query targets */
    for(var x=0; x<query.targets.length; x++) {
      var target = query.targets[x];
      target.host      = this._fixup_regex(target.host);
      target.service   = this._fixup_regex(target.service);
      target.perflabel = this._fixup_regex(target.perflabel);
    }

    var This = this;
    return this.backendSrv.datasourceRequest({
      url: this.url + '/index.php/api/metrics',
      data: query,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(function(result) { return(This.dataQueryMapper(result, options)) });
  }

  /* maps the result data from pnp into grafana data format */
  dataQueryMapper(result, options) {
    var data = {data:[]};
    for(var x=0; x < result.data.targets.length; x++) {
      for(var k=0; k < result.data.targets[x].length; k++) {
        var target = options.targets[x];
        var res    = result.data.targets[x][k];
        var alias = target.perflabel;
        if(target.alias) {
          alias = target.alias;
          var scopedVars = {
            tag_host      : {value: res.host},
            tag_service   : {value: res.service},
            tag_perflabel : {value: res.perflabel},
            tag_label     : {value: res.perflabel}
          };
          alias = this.templateSrv.replace(alias, scopedVars);
        }
        var datapoints = res.datapoints;
        var length     = datapoints.length;
        // remove the last few "null" values from the series because the last value is quite often null
        // and would break current value in legend tables
        for(var y=1; y < 5; y++) {
          if(length > y && datapoints[length-y][0] === null) {
            datapoints.pop();
          } else {
            break;
          }
        }
        var length = datapoints.length;
        var fill   = options.targets[x].fill;
        if(fill != "fill") {
          if(fill == "zero") { fill = 0; }
          if(fill == "gap")  { fill = undefined; }
          for(var y=0; y<length; y++) {
            if(datapoints[y][0] === null) {
              datapoints[y][0] = fill;
            }
          }
        }
        data.data.push({
          "target": alias,
          "datapoints": datapoints
        });
      }
    }
    return(data);
  }

  /* convert list selection into regular expression
   * in:  /^{a,b,c}$/
   * out: /^(a|b|c)$/
   */
  _fixup_regex(value) {
    var matches = value.match(/^\/\^\{(.*)\}\$\/$/);
    if(!matches) { return(value); }
    var values = matches[1].split(/,/);
    return('/^('+values.join('|')+')$/');
  }

  testDatasource() {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/index.php/api',
      method: 'GET'
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });
  }

  /* used from the query editor to get lists of objects of given type */
  metricFindQuery(options, type) {
    var This = this;
    var mapper = this.mapToTextValueHost;
    var url    = this.url + '/index.php/api/hosts';
    var data   = {};
    if(type == "service") {
      url          = this.url + '/index.php/api/services/';
      data.host    = this._fixup_regex(this.templateSrv.replace(options.host));
      mapper       = this.mapToTextValueService;
    }
    if(type == "perflabel") {
      url          = this.url + '/index.php/api/labels/';
      data.host    = this._fixup_regex(this.templateSrv.replace(options.host));
      data.service = this._fixup_regex(this.templateSrv.replace(options.service));
      mapper       = this.mapToTextValuePerflabel;
    }

    return this.backendSrv.datasourceRequest({
      url:     url,
      data:    data,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(mapper)
    .then(function(data) {
      /* prepend templating variables */
      for(var x=0; x<This.templateSrv.variables.length; x++) {
        data.unshift({ text:  '/^$'+This.templateSrv.variables[x].name+'$/',
                       value: '/^$'+This.templateSrv.variables[x].name+'$/' });
      }
      return(data);
    });
  }

  mapToTextValueHost(result) {
    return _.map(result.data.hosts, (d, i) => {
      return { text: d.name, value: d.name };
    });
  }

  mapToTextValueService(result) {
    return _.map(result.data.services, (d, i) => {
      return { text: d.name, value: d.name };
    });
  }

  mapToTextValuePerflabel(result) {
    return _.map(result.data.labels, (d, i) => {
      return { text: d.name, value: d.name };
    });
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.host !== 'select host';
    });
    options.targets = _.filter(options.targets, target => {
      return target.service !== 'select service';
    });
    options.targets = _.filter(options.targets, target => {
      return target.perflabel !== 'select performance label';
    });

    var targets = _.map(options.targets, target => {
      return {
        host: this.templateSrv.replace(target.host),
        service: this.templateSrv.replace(target.service),
        perflabel: this.templateSrv.replace(target.perflabel),
        alias: this.templateSrv.replace(target.alias),
        type: this.templateSrv.replace(target.type),
        fill: this.templateSrv.replace(target.fill),
        refId: target.refId,
        hide: target.hide
      };
    });

    options.targets = targets;

    return options;
  }
}
