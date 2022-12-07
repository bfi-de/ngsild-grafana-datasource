import { DataQuery, DataSourceJsonData } from '@grafana/data';
// TODO cf https://github.com/easy-global-market/grafana-ngsild-plugin/blob/master/src/types.ts

export enum NgsildQueryType {
  ENTITY = "entity",
  TEMPORAL = "temporal",
  GEO = "geo",
  TYPES = "type",
  VERSION = "version",
  ATTRIBUTES = "attributes",
  NODE_GRAPH = "nodegraph"
}

export const queryTypeForValue = (type?: string): NgsildQueryType|undefined => {
  if (!type)
    {return undefined;}
  switch (type.toLowerCase()) {
  case "entity":
  case "entities":
    return NgsildQueryType.ENTITY;
  case "temporal":
  case "timseries":
    return NgsildQueryType.TEMPORAL;
  case "geo":
    return NgsildQueryType.GEO;
  case "type":
  case "types":
    return NgsildQueryType.TYPES;
  case "version":
    return NgsildQueryType.VERSION;
  case "attribute":
  case "attributes":
    return NgsildQueryType.ATTRIBUTES;
  case "graph":
  case "nodegraph":
  case "node_graph":
    return NgsildQueryType.NODE_GRAPH;
  default:
    return undefined;
  }
}

export enum TimeseriesAggregationMethod {
  TOTAL_COUNT = "totalCount",
  DISTINCT_COUNT = "distinctCount",
  // TODO what about distinctValue?
  SUM = "sum",
  AVERAGE = "avg",
  MIN = "min",
  MAX = "max",
  STANDARD_DEVIATION = "stddev",
  SUM_SQUARE = "sumsq"
}

export const aggregationMethodForValue = (method?: string): TimeseriesAggregationMethod|undefined => {
  if (!method)
    {return undefined;}
  switch (method.toLowerCase()) {
  case "totalcount":
  case "total_count":
    return TimeseriesAggregationMethod.TOTAL_COUNT;
  case "distinctcount":
  case "distinct_count":
    return TimeseriesAggregationMethod.DISTINCT_COUNT;
  case "sum":
    return TimeseriesAggregationMethod.SUM;
  case "avg":
  case "average":
    return TimeseriesAggregationMethod.AVERAGE;
  case "min":
    return TimeseriesAggregationMethod.MIN;
  case "max":
    return TimeseriesAggregationMethod.MAX;
  case "stddev":
  case "standard_deviation":
    return TimeseriesAggregationMethod.STANDARD_DEVIATION;
  case "sumsq":
  case "sumsquare":
  case "sum_square":
    return TimeseriesAggregationMethod.SUM_SQUARE;
  default:
    return undefined;
  }

}

export enum GeorelProperty {
  NONE = "none",
  NEAR = "near",
  EQUALS = "equals",
  DISJOINT = "disjoint",
  INTERSECTS = "intersects",
  WITHIN = "within",
  CONTAINS = "contains",
  OVERLAPS = "overlaps"
}

export const georelFromValue = (georel?: string): GeorelProperty => {
  if (!georel)
    {return GeorelProperty.NONE;}
  georel = georel.toLowerCase();
  if (georel === "near" || georel.startsWith("near;")) // in this case it should have further qualifiers
    {return GeorelProperty.NEAR;} 
  switch (georel.toLowerCase()) {
  case "equals":
    return GeorelProperty.EQUALS;
  case "disjoint":
    return GeorelProperty.DISJOINT;
  case "intersects":
    return GeorelProperty.INTERSECTS;
  case "within":
    return GeorelProperty.WITHIN;
  case "contains":
    return GeorelProperty.CONTAINS;
  case "overlaps":
    return GeorelProperty.OVERLAPS;
  default:
    return GeorelProperty.NONE;
  }
}

// TODO support Array<string> for each of the options?
export interface NgsildQuery extends DataQuery {
  entityId?: string;
  attributes?: string[];
  entityType?: string; // note: multiple types are supported in most operations as a comma-separated string
  useLongEntityName?: boolean;
  /**
   * A query adhering to the NGSI-LD query language
   */
  customQuery?: string;

  /**
   * Filter for geometric properties.
   * Geo relationship as per clause 4.10.
   * Examples:
   *  - near;maxDistance==2000 (in m; also minDistance)
   *  - equals
   *  - disjoint
   *  - intersects
   *  - within
   *  - contains
   *  - overlaps
   */
  georel?: string;
  /**
   * Filter for geometric properties.
   * Geometry as per clause 4.10.
   * Examples:
   *   - Point, Polygon
   */
  geometry?: string;
   /**
    * Filter for geometric properties.
    * Coordinates serialized as a string as per clause 4.10.
    * Examples
    *   - [8,40] (for Point)
    *   - [[[100.0,0.0],[101.0,0.0],[101.0,1.0],[100.0,1.0],[100.0,0.0]]] (for Polygon)
    */
    coordinates?: string;
  /**
   * Filter for geometric properties. Default: "location". Typical examples:
   *   - location
   *   - observationSpace
   *   - operationSpace
   */
  geoproperty?: string; 

  /**
   * Only relevant for queryType TEMPORAL
   * Supported values "totalCount", "distinctCount", "sum", "avg", "min", "max","stddev", "sumsq".
   * Note: this is not implemented in Mintaka: https://github.com/FIWARE/mintaka/issues/99 and not tested yet
   */
  aggrMethod?: string;
  /**
   * Only relevant for queryType TEMPORAL
   * Note: this is not implemented in Mintaka: https://github.com/FIWARE/mintaka/issues/99  and not tested yet
   */
  aggrPeriodDuration?: string
  /**
   * Only relevant for queryType NODE_GRAPH.
   * Attributes whose values are displayed within the nodes.
   * 
   * Key "": default attributes
   * Other keys: entity types
   * Specific settings per type overwrite the default keys
   */
  primaryNodeAttributes?: Record<string, string[]>;
  /**
   * Only relevant for queryType NODE_GRAPH
   * Attributes whose values are displayed within the nodes.
   * 
   * Key "": default attributes
   * Other keys: entity types
   * Specific settings per type overwrite the default keys
   */
  secondaryNodeAttributes?: Record<string, string[]>;

  /**
   * Only relevant for queryType NODE_GRAPH
   * Attribute used to derive the arc coloring.
   * Must take values between 0 and 1. (TODO allow for value range config?)
   */
   arcColorNodeAttributes?: Record<string, string[]>;
   arcColorComplementLabel?: string;
  /**
   * Only relevant for queryType NODE_GRAPH
   */
  primaryArcColor?: string;
  /**
   * Only relevant for queryType NODE_GRAPH
   */
  secondaryArcColor?: string;

}

export const defaultQuery: Partial<NgsildQuery> = {
  queryType: NgsildQueryType.TEMPORAL.valueOf()

};

/**
 * These are options configured for each DataSource instance
 */
export interface NgsildSourceOptions extends DataSourceJsonData {
  contextUrl?: string;
  timeseriesUrl?: string;
  tokenUrl?: string;
  //tokenAuth?: string; // will be set automatically to "tokenAuth" when auth is active => fed into plugin.json
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend 
 * TODO auth
 */
export interface NgsildSecureJsonData {
  clientId?: string;
  clientSecret?: string;
}
