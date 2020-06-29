'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AnnotationsQueryCtrl = exports.QueryOptionsCtrl = exports.ConfigCtrl = exports.QueryCtrl = exports.Datasource = undefined;

var _datasource = require('./datasource');

var _query_ctrl = require('./query_ctrl');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PNPConfigCtrl = function PNPConfigCtrl() {
  _classCallCheck(this, PNPConfigCtrl);
};

PNPConfigCtrl.templateUrl = 'partials/config.html';

var PNPQueryOptionsCtrl = function PNPQueryOptionsCtrl() {
  _classCallCheck(this, PNPQueryOptionsCtrl);
};

PNPQueryOptionsCtrl.templateUrl = 'partials/query.options.html';

var PNPAnnotationsQueryCtrl = function PNPAnnotationsQueryCtrl() {
  _classCallCheck(this, PNPAnnotationsQueryCtrl);
};

PNPAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';

exports.Datasource = _datasource.PNPDatasource;
exports.QueryCtrl = _query_ctrl.PNPDatasourceQueryCtrl;
exports.ConfigCtrl = PNPConfigCtrl;
exports.QueryOptionsCtrl = PNPQueryOptionsCtrl;
exports.AnnotationsQueryCtrl = PNPAnnotationsQueryCtrl;
//# sourceMappingURL=module.js.map
