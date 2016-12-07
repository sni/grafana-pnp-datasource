'use strict';

System.register(['./datasource', './query_ctrl'], function (_export, _context) {
  "use strict";

  var PNPDatasource, PNPDatasourceQueryCtrl, PNPConfigCtrl, PNPQueryOptionsCtrl, PNPAnnotationsQueryCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_datasource) {
      PNPDatasource = _datasource.PNPDatasource;
    }, function (_query_ctrl) {
      PNPDatasourceQueryCtrl = _query_ctrl.PNPDatasourceQueryCtrl;
    }],
    execute: function () {
      _export('ConfigCtrl', PNPConfigCtrl = function PNPConfigCtrl() {
        _classCallCheck(this, PNPConfigCtrl);
      });

      PNPConfigCtrl.templateUrl = 'partials/config.html';

      _export('QueryOptionsCtrl', PNPQueryOptionsCtrl = function PNPQueryOptionsCtrl() {
        _classCallCheck(this, PNPQueryOptionsCtrl);
      });

      PNPQueryOptionsCtrl.templateUrl = 'partials/query.options.html';

      _export('AnnotationsQueryCtrl', PNPAnnotationsQueryCtrl = function PNPAnnotationsQueryCtrl() {
        _classCallCheck(this, PNPAnnotationsQueryCtrl);
      });

      PNPAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';

      _export('Datasource', PNPDatasource);

      _export('QueryCtrl', PNPDatasourceQueryCtrl);

      _export('ConfigCtrl', PNPConfigCtrl);

      _export('QueryOptionsCtrl', PNPQueryOptionsCtrl);

      _export('AnnotationsQueryCtrl', PNPAnnotationsQueryCtrl);
    }
  };
});
//# sourceMappingURL=module.js.map
