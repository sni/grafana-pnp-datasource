import _ from "lodash";

export class PNPDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.basicAuth = instanceSettings.basicAuth;

    this.DEFAULT_HOST = "select host";
    this.DEFAULT_SERVICE = "select service";
    this.DEFAULT_PERFLABEL = "select performance label";
  }

  /* fetch pnp rrd data */
  query(options) {
    var query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);
    query.targets = query.targets.filter(t => t.host);      /* hide querys without a host filter */
    query.targets = query.targets.filter(t => t.service);   /* hide querys without a service filter */
    query.targets = query.targets.filter(t => t.perflabel); /* hide querys without a perflabel filter */

    if(query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    query.start = Number(options.range.from.toDate().getTime() / 1000).toFixed();
    query.end   = Number(options.range.to.toDate().getTime() / 1000).toFixed();

    /* fixup regex syntax in query targets */
    for(var x=0; x<query.targets.length; x++) {
      var target = query.targets[x];
      if(target.host      == this.DEFAULT_HOST)      { target.host      = '' }
      if(target.service   == this.DEFAULT_SERVICE)   { target.service   = '' }
      if(target.perflabel == this.DEFAULT_PERFLABEL) { target.perflabel = '' }

      target.host      = this._fixup_regex(target.host);
      target.service   = this._fixup_regex(target.service);
      target.perflabel = this._fixup_regex(target.perflabel);
    }

    var This = this;
    var requestOptions = this._requestOptions({
      url: this.url + '/index.php/api/metrics',
      data: query,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return this.backendSrv.datasourceRequest(requestOptions)
                          .then(function(result) {
                            return(This.dataQueryMapper(result, options))
                          });
  }

  /* maps the result data from pnp into grafana data format */
  dataQueryMapper(result, options) {
    var data = {data:[]};
    if(!result || !result.data || !result.data.targets) {
        return(data);
    }
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
    if(value == undefined || value == null) {
      return value;
    }
    var matches = value.match(/^\/\^\{(.*)\}\$\/$/);
    if(!matches) { return(value); }
    var values = matches[1].split(/,/);
    for(var x = 0; x < values.length; x++) {
      values[x] = values[x].replace(/\//, '\\/');
    }
    return('/^('+values.join('|')+')$/');
  }

  testDatasource() {
    var requestOptions = this._requestOptions({
      url: this.url + '/index.php/api',
      method: 'GET'
    });
    return this.backendSrv.datasourceRequest(requestOptions)
      .then(response => {
        if (response.status === 200) {
          return { status: "success", message: "Data source is working", title: "Success" };
        }
      });
  }

  /* used from the query editor to get lists of objects of given type */
  metricFindQuery(options, type, prependVariables) {
    var This = this;
    var mapper;
    var url;
    var data   = {};

    // expand template querys
    if(options != undefined && type == undefined) {
      var query = options.split(/\s+/);
      if(query[0]) {
        type = query.shift().replace(/s$/, "");
      }
      // parse simple where statements
      if(query[0] != undefined) {
        options = {};
        if(query[0].toLowerCase() != "where") {
          throw new Error("query syntax error, expecting WHERE");
        }
        query.shift();

        while(query.length >= 3) {
          var t   = query.shift().toLowerCase();
          var op  = query.shift().toLowerCase();
          var val = query.shift();
          if(op != "=") {
            throw new Error("query syntax error, operator must be '='");
          }
          options[t] = val;

          if(query[0] != undefined) {
            if(query[0].toLowerCase() == 'and') {
              query.shift();
            } else {
              throw new Error("query syntax error, expecting AND");
            }
          }
        }

        // still remaining filters?
        if(query.length > 0) {
          throw new Error("query syntax error");
        }
      }
    }

    if(type == "host") {
      url          = this.url + '/index.php/api/hosts';
      mapper       = this.mapToTextValueHost;
    }
    else if(type == "service") {
      url          = this.url + '/index.php/api/services/';
      data.host    = this._fixup_regex(this.templateSrv.replace(options.host));
      mapper       = this.mapToTextValueService;
      if(!data.host) { data.host = '/.*/'; }
    }
    else if(type == "perflabel" || type == "label") {
      url          = this.url + '/index.php/api/labels/';
      data.host    = this._fixup_regex(this.templateSrv.replace(options.host));
      data.service = this._fixup_regex(this.templateSrv.replace(options.service));
      mapper       = this.mapToTextValuePerflabel;
      if(!data.host)    { data.host    = '/.*/'; }
      if(!data.service) { data.service = '/.*/'; }
    }

    if(url == undefined) {
      throw new Error("query syntax error");
    }

    var requestOptions = this._requestOptions({
      url:     url,
      data:    data,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return this.backendSrv.datasourceRequest(requestOptions)
      .then(mapper)
      .then(function(data) {
        /* prepend templating variables */
        if(prependVariables) {
          for(var x=0; x<This.templateSrv.variables.length; x++) {
            data.unshift({ text:  '/^$'+This.templateSrv.variables[x].name+'$/',
                           value: '/^$'+This.templateSrv.variables[x].name+'$/' });
          }
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
      return { text: (d.servicedesc || d.name), value: d.name };
    });
  }

  mapToTextValuePerflabel(result) {
    return _.map(result.data.labels, (d, i) => {
      return { text: (d.label || d.name), value: (d.label || d.name) };
    });
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.host !== this.DEFAULT_HOST;
    });
    options.targets = _.filter(options.targets, target => {
      return target.service !== this.DEFAULT_SERVICE;
    });
    options.targets = _.filter(options.targets, target => {
      return target.perflabel !== this.DEFAULT_PERFLABEL;
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

  _requestOptions(options) {
    options = options || {};
    options.headers = options.headers || {};
    if(this.basicAuth || this.withCredentials) {
      options.withCredentials = true;
    }
    if(this.basicAuth) {
      options.headers.Authorization = this.basicAuth;
    }
    return(options);
  }
}
