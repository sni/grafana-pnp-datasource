import {PNPDatasource} from './datasource';
import {PNPDatasourceQueryCtrl} from './query_ctrl';

class PNPConfigCtrl {}
PNPConfigCtrl.templateUrl = 'partials/config.html';

class PNPQueryOptionsCtrl {}
PNPQueryOptionsCtrl.templateUrl = 'partials/query.options.html';

class PNPAnnotationsQueryCtrl {}
PNPAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html'

export {
  PNPDatasource as Datasource,
  PNPDatasourceQueryCtrl as QueryCtrl,
  PNPConfigCtrl as ConfigCtrl,
  PNPQueryOptionsCtrl as QueryOptionsCtrl,
  PNPAnnotationsQueryCtrl as AnnotationsQueryCtrl
};
