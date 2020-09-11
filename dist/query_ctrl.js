'use strict';

System.register(['app/plugins/sdk', './css/query-editor.css!'], function (_export, _context) {
  "use strict";

  var QueryCtrl, _createClass, PNPDatasourceQueryCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      QueryCtrl = _appPluginsSdk.QueryCtrl;
    }, function (_cssQueryEditorCss) {}],
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

      _export('PNPDatasourceQueryCtrl', PNPDatasourceQueryCtrl = function (_QueryCtrl) {
        _inherits(PNPDatasourceQueryCtrl, _QueryCtrl);

        function PNPDatasourceQueryCtrl($scope, $injector, uiSegmentSrv) {
          _classCallCheck(this, PNPDatasourceQueryCtrl);

          var _this = _possibleConstructorReturn(this, (PNPDatasourceQueryCtrl.__proto__ || Object.getPrototypeOf(PNPDatasourceQueryCtrl)).call(this, $scope, $injector));

          _this.scope = $scope;
          _this.uiSegmentSrv = uiSegmentSrv;
          _this.target.host = _this.target.host || _this.datasource.DEFAULT_HOST;
          _this.target.service = _this.target.service || _this.datasource.DEFAULT_SERVICE;
          _this.target.perflabel = _this.target.perflabel || _this.datasource.DEFAULT_PERFLABEL;
          _this.target.type = _this.target.type || 'AVERAGE';
          _this.target.fill = _this.target.fill || 'fill';
          _this.target.factor = _this.target.factor || '';
          return _this;
        }

        _createClass(PNPDatasourceQueryCtrl, [{
          key: 'getHost',
          value: function getHost() {
            return this.datasource.metricFindData("host", this.target, true).then(this.uiSegmentSrv.transformToSegments(false));
          }
        }, {
          key: 'getService',
          value: function getService() {
            return this.datasource.metricFindData("service", this.target, true).then(this.uiSegmentSrv.transformToSegments(false));
          }
        }, {
          key: 'getPerflabel',
          value: function getPerflabel() {
            return this.datasource.metricFindData("perflabel", this.target, true).then(this.uiSegmentSrv.transformToSegments(false));
          }
        }, {
          key: 'onChangeInternal',
          value: function onChangeInternal() {
            this.panelCtrl.refresh();
          }
        }, {
          key: 'getCollapsedText',
          value: function getCollapsedText() {
            if (this.target.perflabel == this.datasource.DEFAULT_PERFLABEL && this.target.host == this.datasource.DEFAULT_HOST && this.target.service == this.datasource.DEFAULT_SERVICE) {
              return "click to edit query";
            }
            return this.target.perflabel + ': ' + this.target.host + ' - ' + this.target.service;
          }
        }]);

        return PNPDatasourceQueryCtrl;
      }(QueryCtrl));

      _export('PNPDatasourceQueryCtrl', PNPDatasourceQueryCtrl);

      PNPDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
    }
  };
});
//# sourceMappingURL=query_ctrl.js.map
