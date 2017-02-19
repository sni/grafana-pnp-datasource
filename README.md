## PNP Grafana Datasource - a grafana backend datasource using pnp to access rrd files

### Usage

    %> cd var/grafana/plugins
    %> git clone https://github.com/sni/grafana-pnp-datasource.git
    %> restart grafana

### Create Datasource

Right now only direct access is possible and the grafana proxy does not work
well with Thruks cookie authentication.

Add a new datasource and select:

Variant A:

Uses the grafana proxy. Must have a local user which is used for all queries.

    - Type 'PNP'
    - Url 'https://localhost/sitename/pnp4nagios'
    - Access 'proxy'
    - Basic Auth 'True'
    - User + Password for local pnp user


Variant B:

Uses direct access. PNP must be accessible from the public.

    - Type 'PNP'
    - Url 'https://yourhost/sitename/pnp4nagios' (Note: this has to be the absolute url)
    - Access 'direct'
    - Http Auth 'With Credentials'

### Queries

Simply select host, service and label in the query editor. Regular expressions
are supported in the host and service field by add slashes like `/.*/`.


### Variables

You may use the following variables in the alias field

    - $tag_host: will be replace with the hostname
    - $tag_service: will be replace with the service name
    - $tag_label: will be replace with the label

### TODO

    - Templating variables support
    - use relative urls in datasource

