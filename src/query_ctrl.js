import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector, uiSegmentSrv)  {
    super($scope, $injector);

    this.scope = $scope;
    this.uiSegmentSrv = uiSegmentSrv;
    this.target.host = this.target.host || 'select host';
    this.target.service = this.target.service || 'select service';
    this.target.perflabel = this.target.perflabel || 'select performance label';
  }

  getHost() {
    return this.datasource.metricFindQuery(this.target, "host")
      .then(this.uiSegmentSrv.transformToSegments(false));
  }

  getService() {
    return this.datasource.metricFindQuery(this.target, "service")
      .then(this.uiSegmentSrv.transformToSegments(false));
  }

  getPerflabel() {
    return this.datasource.metricFindQuery(this.target, "perflabel")
      .then(this.uiSegmentSrv.transformToSegments(false));
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
