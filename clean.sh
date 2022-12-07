#!/bin/bash
docker volume rm -f $(docker volume ls -f name=ngsild-grafana-datasource_* -q)
