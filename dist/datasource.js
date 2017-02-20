'use strict';

System.register(['lodash'], function (_export, _context) {
  "use strict";

  var _, _createClass, PNPDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('PNPDatasource', PNPDatasource = function () {
        function PNPDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, PNPDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.withCredentials = instanceSettings.withCredentials;
          this.basicAuth = instanceSettings.basicAuth;
        }

        /* fetch pnp rrd data */


        _createClass(PNPDatasource, [{
          key: 'query',
          value: function query(options) {
            var query = this.buildQueryParameters(options);
            query.targets = query.targets.filter(function (t) {
              return !t.hide;
            });
            query.targets = query.targets.filter(function (t) {
              return t.host;
            }); /* hide querys without a host filter */
            query.targets = query.targets.filter(function (t) {
              return t.service;
            }); /* hide querys without a service filter */
            query.targets = query.targets.filter(function (t) {
              return t.perflabel;
            }); /* hide querys without a perflabel filter */

            if (query.targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            query.start = Number(options.range.from.toDate().getTime() / 1000).toFixed();
            query.end = Number(options.range.to.toDate().getTime() / 1000).toFixed();

            /* fixup regex syntax in query targets */
            for (var x = 0; x < query.targets.length; x++) {
              var target = query.targets[x];
              target.host = this._fixup_regex(target.host);
              target.service = this._fixup_regex(target.service);
              target.perflabel = this._fixup_regex(target.perflabel);
            }

            var This = this;
            var requestOptions = this._requestOptions({
              url: this.url + '/index.php/api/metrics',
              data: query,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            return this.backendSrv.datasourceRequest(requestOptions).then(function (result) {
              return This.dataQueryMapper(result, options);
            });
          }
        }, {
          key: 'dataQueryMapper',
          value: function dataQueryMapper(result, options) {
            var data = { data: [] };
            for (var x = 0; x < result.data.targets.length; x++) {
              for (var k = 0; k < result.data.targets[x].length; k++) {
                var target = options.targets[x];
                var res = result.data.targets[x][k];
                var alias = target.perflabel;
                if (target.alias) {
                  alias = target.alias;
                  var scopedVars = {
                    tag_host: { value: res.host },
                    tag_service: { value: res.service },
                    tag_perflabel: { value: res.perflabel },
                    tag_label: { value: res.perflabel }
                  };
                  alias = this.templateSrv.replace(alias, scopedVars);
                }
                var datapoints = res.datapoints;
                var length = datapoints.length;
                // remove the last few "null" values from the series because the last value is quite often null
                // and would break current value in legend tables
                for (var y = 1; y < 5; y++) {
                  if (length > y && datapoints[length - y][0] === null) {
                    datapoints.pop();
                  } else {
                    break;
                  }
                }
                var length = datapoints.length;
                var fill = options.targets[x].fill;
                if (fill != "fill") {
                  if (fill == "zero") {
                    fill = 0;
                  }
                  if (fill == "gap") {
                    fill = undefined;
                  }
                  for (var y = 0; y < length; y++) {
                    if (datapoints[y][0] === null) {
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
            return data;
          }
        }, {
          key: '_fixup_regex',
          value: function _fixup_regex(value) {
            if (value == undefined || value == null) {
              return value;
            }
            var matches = value.match(/^\/\^\{(.*)\}\$\/$/);
            if (!matches) {
              return value;
            }
            var values = matches[1].split(/,/);
            return '/^(' + values.join('|') + ')$/';
          }
        }, {
          key: 'testDatasource',
          value: function testDatasource() {
            var requestOptions = this._requestOptions({
              url: this.url + '/index.php/api',
              method: 'GET'
            });
            return this.backendSrv.datasourceRequest(requestOptions).then(function (response) {
              if (response.status === 200) {
                return { status: "success", message: "Data source is working", title: "Success" };
              }
            });
          }
        }, {
          key: 'metricFindQuery',
          value: function metricFindQuery(options, type, prependVariables) {
            var This = this;
            var mapper = this.mapToTextValueHost;
            var url = this.url + '/index.php/api/hosts';
            var data = {};
            if (type == "service") {
              url = this.url + '/index.php/api/services/';
              data.host = this._fixup_regex(this.templateSrv.replace(options.host));
              mapper = this.mapToTextValueService;
            }
            if (type == "perflabel") {
              url = this.url + '/index.php/api/labels/';
              data.host = this._fixup_regex(this.templateSrv.replace(options.host));
              data.service = this._fixup_regex(this.templateSrv.replace(options.service));
              mapper = this.mapToTextValuePerflabel;
            }

            var requestOptions = this._requestOptions({
              url: url,
              data: data,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            return this.backendSrv.datasourceRequest(requestOptions).then(mapper).then(function (data) {
              /* prepend templating variables */
              if (prependVariables) {
                for (var x = 0; x < This.templateSrv.variables.length; x++) {
                  data.unshift({ text: '/^$' + This.templateSrv.variables[x].name + '$/',
                    value: '/^$' + This.templateSrv.variables[x].name + '$/' });
                }
              }
              return data;
            });
          }
        }, {
          key: 'mapToTextValueHost',
          value: function mapToTextValueHost(result) {
            return _.map(result.data.hosts, function (d, i) {
              return { text: d.name, value: d.name };
            });
          }
        }, {
          key: 'mapToTextValueService',
          value: function mapToTextValueService(result) {
            return _.map(result.data.services, function (d, i) {
              return { text: d.name, value: d.name };
            });
          }
        }, {
          key: 'mapToTextValuePerflabel',
          value: function mapToTextValuePerflabel(result) {
            return _.map(result.data.labels, function (d, i) {
              return { text: d.name, value: d.name };
            });
          }
        }, {
          key: 'buildQueryParameters',
          value: function buildQueryParameters(options) {
            var _this = this;

            //remove placeholder targets
            options.targets = _.filter(options.targets, function (target) {
              return target.host !== 'select host';
            });
            options.targets = _.filter(options.targets, function (target) {
              return target.service !== 'select service';
            });
            options.targets = _.filter(options.targets, function (target) {
              return target.perflabel !== 'select performance label';
            });

            var targets = _.map(options.targets, function (target) {
              return {
                host: _this.templateSrv.replace(target.host),
                service: _this.templateSrv.replace(target.service),
                perflabel: _this.templateSrv.replace(target.perflabel),
                alias: _this.templateSrv.replace(target.alias),
                type: _this.templateSrv.replace(target.type),
                fill: _this.templateSrv.replace(target.fill),
                refId: target.refId,
                hide: target.hide
              };
            });

            options.targets = targets;

            return options;
          }
        }, {
          key: '_requestOptions',
          value: function _requestOptions(options) {
            options = options || {};
            options.headers = options.headers || {};
            if (this.basicAuth || this.withCredentials) {
              options.withCredentials = true;
            }
            if (this.basicAuth) {
              options.headers.Authorization = this.basicAuth;
            }
            return options;
          }
        }]);

        return PNPDatasource;
      }());

      _export('PNPDatasource', PNPDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
