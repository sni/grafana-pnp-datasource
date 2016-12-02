"use strict";

System.register(["lodash"], function (_export, _context) {
  "use strict";

  var _, _createClass, GenericDatasource;

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

      _export("GenericDatasource", GenericDatasource = function () {
        function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, GenericDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
        }

        _createClass(GenericDatasource, [{
          key: "query",
          value: function query(options) {
            console.log("query");
            console.log(options);
            var query = this.buildQueryParameters(options);
            query.targets = query.targets.filter(function (t) {
              return !t.hide;
            });

            if (query.targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            return this.backendSrv.datasourceRequest({
              url: this.url + '/index.php/json',
              data: query,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }, {
          key: "testDatasource",
          value: function testDatasource() {
            return this.backendSrv.datasourceRequest({
              url: this.url + '/index.php/json',
              method: 'GET'
            }).then(function (response) {
              if (response.status === 200) {
                return { status: "success", message: "Data source is working", title: "Success" };
              }
            });
          }
        }, {
          key: "metricFindQuery",
          value: function metricFindQuery(options, type) {
            var interpolated = {
              host: this.templateSrv.replace(options.host, null, 'regex')
            };

            var search = "";
            var mapper = this.mapToTextValueHost;
            if (type == "service") {
              search = '?host=' + options.host;
              mapper = this.mapToTextValueService;
            }
            if (type == "perflabel") {
              search = '?host=' + options.host;
              mapper = this.mapToTextValuePerflabel;
            }

            return this.backendSrv.datasourceRequest({
              url: this.url + '/index.php/json' + search,
              data: interpolated,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(mapper);
          }
        }, {
          key: "mapToTextValueHost",
          value: function mapToTextValueHost(result) {
            return _.map(result.data, function (d, i) {
              return { text: d.hostname, value: d.hostname };
            });
          }
        }, {
          key: "mapToTextValueService",
          value: function mapToTextValueService(result) {
            return _.map(result.data, function (d, i) {
              return { text: d.servicedesc, value: d.servicedesc };
            });
          }
        }, {
          key: "mapToTextValuePerflabel",
          value: function mapToTextValuePerflabel(result) {
            return _.map(result.data, function (d, i) {
              return { text: d.ds_name, value: d.ds_name };
            });
          }
        }, {
          key: "buildQueryParameters",
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
                refId: target.refId,
                hide: target.hide
              };
            });

            options.targets = targets;

            return options;
          }
        }]);

        return GenericDatasource;
      }());

      _export("GenericDatasource", GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
