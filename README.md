# NGSI-LD Grafana datasource plugin

A Grafana datasource for FIWARE context brokers. Supports temporal, geo and graph data. 

## Getting started

This assumes that docker (and docker-compose) is installed. Run the following commands, starting from the repo base folder:

```
cd datasource
./install.sh
./build.sh
cd ..
./run.sh
```

This will spin up an NGSI-LD context broker along with several supporting services and sample data, as well as a Grafana instance with a preconfigured datasource and some sample dashboards. Visit http://localhost:3000/dashboards in the browser to see the dashboards. To shutdown everything, run `./stop.sh`. See [Build the plugin](#build-the-plugin) and [Run sample scenario](#run-sample-scenario) for details and options.

## Datasource configuration

After creating an instance of the datasource, the various URL endpoints for the context broker, context provider and token provider need to be configured.

<img src="./screenshots/config.png" alt="Screenshot of the datasource configuration menu" style="width:500px;"/>


* Context broker URL (url): The main URL of the FIWARE context broker, e.g. [Orion-LD](https://github.com/FIWARE/context.Orion-LD), such as http://localhost:1026.
* Temporal broker URL (jsonData.timeseriesUrl): The URL of the temporal endpoint of the FIWARE context broker, e.g. provided by [Mintaka](https://github.com/FIWARE/mintaka), such as http://localhost:8083
* Context URL (jsonData.contextUrl): The URL of the context source, such as http://localhost/ngsi-context.jsonld
* OAuth token URL (jsonData.tokenUrl): When authentication is required to access the context broker this is the URL of the IDM/OAuth token endpoint, provided for instance by [Keyrock](https://github.com/ging/fiware-idm). Example: http://localhost:3005/oauth2/token
* Client id (secureJsonData.clientId): The client id for the OAuth client credentials grant flow assigned to Grafana. This must be configured in the IDM.
* Client secret (secureJsonData.clientSecret): The client id for the OAuth client credentials grant flow assigned to Grafana. This must be configured in the IDM.

When using the provided docker compose setup to run Grafana with the datasource, configurations can be provided by means of environment variables, see [Run standalone Grafana with datasource instance](#run-standalone-grafana-with-datasource-instance)

## Query configurations

The [sample scenario](#run-sample-scenario) included in this repository comes with three sample dashboards which can be used as templates.

### Temporal/Timeseries graphs

Timeseries queries are the default query type for this plugin. They retrieve the temporal evolution of an attribute. The temporal query endpoint `/temporal/entities` must be active for this, which is optional for NGSI-LD brokers. When used with Orion-LD, the additional Mintaka component must be present.

<img src="./screenshots/temporalConfig.png" alt="Screenshot of the menu for a temporal query" style="width:900px;"/>

### Current values

Queries for the current value of an attribute are supported as well, by selecting the *current value* query type.

<img src="./screenshots/currentValueConfig.png" alt="Screenshot of the menu for a current value query" style="width:900px;"/>

### Map visualization

Map visualizations can be realized by means of *geo* queries, and the Grafana [Geomap](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/geomap/) panel type. 
Entities matching the selected filter conditions will be shown as markers on the map. The size of the markers and several other properties can be adapted to the values of specified entity attributes in the panel configuration on the right.
 
<img src="./screenshots/geoConfig.png" alt="Screenshot of the menu for a geomap visualization" style="width:900px;"/>

### Node graphs

By selecting the *node graph* query type the datasource provides input data for the Grafana [Node graph](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/) panel type. In the dedicated menu for this query type the user can select which attribute values are shown in the nodes and how the color of the nodes will be determined.

<img src="./screenshots/graphConfig.png" alt="Screenshot of the menu for a node graph visualization" style="width:900px;"/>



## Folder structure

```
|-- datasource 
       |-- plugin:   Source code of the datasource
       |-- volumes:  Preconfigured Grafana configs (datasource, dashboards) for the sample scenarios
|-- modelSteel:      Data model for the sample scenarios
|-- screenshots:     Screenshots
|-- volumes:         IDM/Keyrock configuration for the authentication scenario
```

## Build the plugin

Use either the Docker workflow or the Node.js workflow.

**Docker workflow**

Switch to the *datasource* directory:

```
cd datasource
```

Install the required dependencies:

```
./install.sh
```

Then build the plugin:

```
./build.sh
```

**Node.js workflow**

Switch to the *plugin* directory:

```
cd datasource/plugin
```

Install the required dependencies:

```
yarn install --ignore-engines
```

Then build the plugin:

```
yarn dev
```


## Run sample scenario

This assumes that the plugin has been built before (see [above](#build-the-plugin)), and requires Docker (docker-compose).
After starting one of the two docker compose scenarios the Grafana frontend will be available at http://localhost:3000. No authentication to Grafana required.

**No authorization**

In this scenario the context broker can be accessed without authentication.

```
./run.sh
```

Stop:
```
./stop.sh
```

**With authorization enabled**

In this scenario the context broker is protected by a [PEP proxy](https://github.com/FIWARE/tutorials.PEP-Proxy), which allows only authenticated users to access the broker. The OAuth 2.0 [client credentials grant flow](https://oauth.net/2/grant-types/client-credentials/) is used for authentication. The datasource plugin gets configured with a client id and client secret, which are used to retrieve an access token from the identity management service. Grafana then forwards this access token to the PEP proxy with every data request (docs here: https://grafana.com/docs/grafana/latest/developers/plugins/add-authentication-for-data-source-plugins/#add-a-oauth-20-proxy-route-to-your-plugin).

```
./run_auth.sh
```

Stop:
```
./stop_auth.sh
```

**Clean up**

In order to perform a clean start, remove all volumes associated to this scenario (stop first):

```
./clean.sh
```

**Update datasource**

After implementing changes in the plugin source code you can update the running instance by executing

```
docker restart fiware-grafana
```

and reload the Grafana tab in the Browser.

## Run standalone Grafana with datasource instance

This assumes that the plugin has been built before (see [above](#build-the-plugin)), and requires Docker (docker-compose).
Switch to the *datasource* directory:

```
cd datasource
```

Then execute either `./run.sh` or 

```
docker compose up -d
```

To stop, run either `./stop.sh` or
```
docker compose down
```

**Configuration options**

These options can be set via environment variables:

* **BROKER_URL**: URL of the context broker. Default: http://host.docker.internal:1026
* **CONTEXT_URL**: URL of the context provider. Default: http://host.docker.internal:3004/ngsi-context.jsonld}
* **TIMESERIES_URL**: URL of the context broker endpoint for temporal queries. Default: http://host.docker.internal:8083
* **TOKEN_URL**: URL of the OAuth token endpoint. Default: empty
* **CLIENT_ID**: OAuth client id. Default: empty
* **CLIENT_SECRET**: OAuth client secret. Default: empty

Example:

```
CLIENT_ID=my-client CLIENT_SECRET=top-secret docker compose up -d
```

## License

Apache 2.0
