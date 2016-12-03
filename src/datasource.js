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
//console.log("query");
//console.log(options);
    var query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);

    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    var me = this;
    return this.backendSrv.datasourceRequest({
      url: this.url + '/index.php/xport/json?host='+options.targets[0].host
                                            +'&srv='+options.targets[0].service
                                            +'&start='+Number(options.range.from.toDate().getTime()/1000).toFixed()
                                            +'&end='+Number(options.range.to.toDate().getTime()/1000).toFixed(),
      //data: query,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(function(result) { return(me.dataQueryMapper(result, options)) });
  }

  dataQueryMapper(result, options) {
console.log("dataQueryMapper");
console.log(options);
console.log(result);
    var index      = 0;
    var datapoints = [];
    var timestamp  = Number(result.data.meta.start);
    var step       = Number(result.data.meta.step);
    for(var x=0; x < result.data.data.row.length; x++) {
      datapoints.push([Number(result.data.data.row[x].v[index]),timestamp*1000]);
      timestamp += step;
    }

    var data = {data:[{
      "target": options.targets[0].host+';'+options.targets[0].service,
      "datapoints": datapoints
    }]};
console.log(data);
    return(data);
  }

  testDatasource() {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/index.php/json',
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

    var search = "";
    var mapper = this.mapToTextValueHost;
    if(type == "service") {
      search = '?host='+options.host;
      mapper = this.mapToTextValueService;
    }
    if(type == "perflabel") {
      search = '?host='+options.host;
      mapper = this.mapToTextValuePerflabel;
    }

    return this.backendSrv.datasourceRequest({
      url: this.url + '/index.php/json'+search,
      data: interpolated,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(mapper);
  }

  mapToTextValueHost(result) {
    return _.map(result.data, (d, i) => {
      return { text: d.hostname, value: d.hostname};
    });
  }

  mapToTextValueService(result) {
    return _.map(result.data, (d, i) => {
      return { text: d.servicedesc, value: d.servicedesc};
    });
  }

  mapToTextValuePerflabel(result) {
    return _.map(result.data, (d, i) => {
      return { text: d.ds_name, value: d.ds_name};
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
        refId: target.refId,
        hide: target.hide,
        target: target.host+';'+target.service
      };
    });

    options.targets = targets;

    return options;
  }
}
