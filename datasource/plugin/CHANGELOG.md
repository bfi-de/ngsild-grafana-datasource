# Changelog

## 1.0.0

Initial release.

## 1.1.0

* Supports other brokers than Orion-LD, by means of setting flavor=generic (default: ~~`orion`~~ `generic`)
* More flexible entity names: [#1](https://github.com/bfi-de/ngsild-grafana-datasource/issues/1)
* Some version updates and related fixes: [#4](https://github.com/bfi-de/ngsild-grafana-datasource/issues/4)

## 1.1.1

* Fix `attrMethods` parameter: [#6](https://github.com/bfi-de/ngsild-grafana-datasource/issues/6)

# 1.1.2

* Multi-tenant support (datasource setting) and scope query: [#7](https://github.com/bfi-de/ngsild-grafana-datasource/issues/7)
* Toggle between *options* (legacy, widely supported) and *format* (new, yet unsupported) parameters
* Hide unsupported authentication settings in direct mode: [#3](https://github.com/bfi-de/ngsild-grafana-datasource/issues/3)

# 1.2.0

* Support other time properties than `observedAt` (i.e. `createdAt`, `modifiedAt`, `deletedAt`)
* Support non-simplified temporal representation (configuration at datasource level): [#2](https://github.com/bfi-de/ngsild-grafana-datasource/issues/2)

# 1.2.1

* Fix temporal query with entity id errors [#9](https://github.com/bfi-de/ngsild-grafana-datasource/issues/9)
* Skip type parameter in query when entity id is specified
