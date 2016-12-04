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

  query(options) {
    var query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);

    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    var res;
    var data = {data:[]};
    for(var i = 0; i < options.targets.length; i++) {
      res = this.pnpQuery(data, options, options.targets[i]);
    }
    return(res);
  }

  pnpQuery(data, options, target) {
    var me = this;
    return this.backendSrv.datasourceRequest({
      url: this.url + '/index.php/api/metrics/'+target.host+'/'+target.service+'/'+target.perflabel
                                            +'?start='+Number(options.range.from.toDate().getTime()/1000).toFixed()
                                            +'&end='+Number(options.range.to.toDate().getTime()/1000).toFixed()
                                            +'&type='+target.type,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(function(result) { return(me.dataQueryMapper(data, result, target)) });
  }

  dataQueryMapper(data, result, target) {
    var alias = target.perflabel;
    if(target.alias) {
      alias = target.alias;
    }
    data.data.push({
      "target": alias,
      "datapoints": result.data[0].datapoints
    });
    return(data);
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

  metricFindQuery(options, type) {
    var interpolated = {
      host: this.templateSrv.replace(options.host, null, 'regex')
    };

    var mapper = this.mapToTextValueHost;
    var url    = this.url + '/index.php/api/hosts';
    if(type == "service") {
      url    = this.url + '/index.php/api/services/'+options.host,
      mapper = this.mapToTextValueService;
    }
    if(type == "perflabel") {
      url    = this.url + '/index.php/api/labels/'+options.host+'/'+options.service,
      mapper = this.mapToTextValuePerflabel;
    }

    return this.backendSrv.datasourceRequest({
      url:     url,
      data:    interpolated,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(mapper);
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
        refId: target.refId,
        hide: target.hide
      };
    });

    options.targets = targets;

    return options;
  }
}
