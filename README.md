# PNP Grafana Datasource

A Grafana backend datasource using PNP4Nagios to access RRD files.

## Installation

Search for `pnp` in the Grafana plugins directory or simply use the grafana-cli command:

    %> grafana-cli plugins install sni-pnp-datasource

Also [OMD-Labs](https://labs.consol.de/omd/) comes with this datasource included, so if
you use OMD-Labs, everything is setup already.

Otherwise follow these steps:

    %> cd var/grafana/plugins
    %> git clone -b release-1.0.7  https://github.com/sni/grafana-pnp-datasource.git
    %> restart grafana

Replace `release-1.0.7` with the last available release branch.

### PNP API

In order to make this datasource work, you need the pnp api. This is a separate
project at the moment and will be part of the official pnp in the future. You
can fetch the `api.php` from https://github.com/lingej/pnp-metrics-api and place
it in your controler folder.

In a standard PNP setup, you could basically just download the api directly into
the controller folder with a simple wget:

    wget "https://github.com/lingej/pnp-metrics-api/raw/master/application/controller/api.php" \
         -O /usr/share/pnp4nagios/html/application/controllers/api.php

Adjust the output path to your installation.

Or simply use the PNP fork from https://github.com/ConSol-Monitoring/pnp which has
added the api already.

### Create Datasource

Add a new datasource and select:

    - Type 'PNP'
    - Url to pnp, ex.: 'https://localhost/sitename/pnp4nagios'

## Example Dashboard

This datasource ships an example dashboard which gets you started and shows the
internal PNP statistics.

## Queries

Simply select host, service and label in the query editor. Regular expressions
are supported in the host and service field by adding slashes like `/.*/`.

## Variables

You may use the following variables in the alias field:

    - $tag_host: will be replaced with the hostname
    - $tag_service: will be replaced with the service name
    - $tag_label: will be replaced with the label
    - $tag_perflabel: same as label

All standard variables will also do.

## Templating

There is basic templating variable support. There are 3 different querys available:

    - $host:    hosts
    - $service: services where host = /^$host$/
    - $label:   labels where host = /^$host$/ and service = /^$service$/

![host variables examples](https://github.com/sni/grafana-pnp-datasource/blob/master/host_template_variables.png)

## Development

To test and improve the plugin you can run Grafana instance in Docker using
following command (in the source directory of this plugin):

  %> make dev

This will start a grafana container and a build watcher which updates the
plugin is the dist/ folder.

The dev instance can be accessed at http://localhost:3000

You need to add the datasource manually.

The grafana widget documentation is available here: https://developers.grafana.com/ui/latest/

### Testing

For testing you can use the demo pnp instance at:

- URL: https://demo.thruk.org/demo4/pnp4nagios
- No authentication required

### Create Release

How to create a new release:

    %> export RELVERSION=1.0.7
    %> export GRAFANA_ACCESS_POLICY_TOKEN=...
    %> vi package.json # replace version
    %> vi CHANGELOG.md # add changelog entry
    %> git commit -am "Release v${RELVERSION}"
    %> git tag -a v${RELVERSION} -m "Create release tag v${RELVERSION}"
    %> make GRAFANA_ACCESS_POLICY_TOKEN=${GRAFANA_ACCESS_POLICY_TOKEN} releasebuild
    # create release here https://github.com/sni/grafana-pnp-datasource/releases/new
    # submit plugin update here https://grafana.com/orgs/sni/plugins

## Changelog

see CHANGELOG.md
