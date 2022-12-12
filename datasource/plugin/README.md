# NGSI-LD Grafana datasource plugin

A Grafana datasource for FIWARE context brokers. Supports temporal, geo and graph data. See https://github.com/bfi-de/ngsild-grafana-datasource. 

## Run with Grafana

For a test setup, extract the .tgz file in the desired directory and execute the following shell command in the same folder (Docker must be running):

```bash
MSYS_NO_PATHCONV=1  docker run --rm -d --name grafana-dev -p 3000:3000 -v $(pwd)/ngsild-grafana-datasource:/var/lib/grafana/plugins/ngsild-grafana-datasource:ro -e GF_PATHS_PLUGINS=/var/lib/grafana/plugins -e GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=ngsild-grafana-datasource -e GF_AUTH_ANONYMOUS_ENABLED=true -e GF_AUTH_ANONYMOUS_ORG_ROLE=Admin -e GF_SERVER_DOMAIN=localhost grafana/grafana:latest
```

Create a new data source at http://localhost:3000/datasources/new. Filter for ngsild and select the NGSI-LD datasource. On the configuration page for the plugin, enter the URLs of the context provider, NGSI-LD broker and the temporal endpoint. With Docker Desktop on Windows the hostname *host.docker.internal* refers to the internal IP address of the host, which can be convenient if the mentioned services run on the host, too.

To stop Grafana, run `docker stop grafana-dev`. 

A complete test scenario with preconfigured sample data in the context broker, preconfigured datasource and dashboards can be found in the git repository https://github.com/bfi-de/ngsild-grafana-datasource. 

## Development: getting started

1. Install dependencies

   ```bash
   yarn install --ignore-engines
   ```

2. Build plugin in development mode or run in watch mode

   ```bash
   yarn dev
   ```

   or

   ```bash
   yarn watch
   ```

3. Build plugin in production mode

   ```bash
   yarn build
   ```

4. Pack plugin after building

   ```bash
   cp -r dist ngsild-grafana-datasource
   tar -czvf ngsild-grafana-datasource-1.0.0.tgz ngsild-grafana-datasource
   rm -rf ngsild-grafana-datasource
   ```
   Adapt the version number.



## Learn more

- [Build a data source plugin tutorial](https://grafana.com/tutorials/build-a-data-source-plugin)
- [Grafana documentation](https://grafana.com/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/) - Grafana Tutorials are step-by-step guides that help you make the most of Grafana
- [Grafana UI Library](https://developers.grafana.com/ui) - UI components to help you build interfaces using Grafana Design System
