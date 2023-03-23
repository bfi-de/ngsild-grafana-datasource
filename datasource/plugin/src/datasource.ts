import defaults from 'lodash/defaults';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { getBackendSrv, BackendSrv, FetchResponse, BackendSrvRequest } from "@grafana/runtime";

import { NgsildQuery, NgsildSourceOptions, defaultQuery, NgsildQueryType, NamePattern, namePatternFromValue } from './types';
import { JsUtils } from 'utils';
import { Measurement, EntityTemporal, INVALID_ATTRIBUTES, Entity, getValue } from 'ngsildTypes';
import { isNumber } from 'lodash';
import { GeoHandler } from 'GeoHandler';
import { NodeGraphHandler } from 'NodeGraphHandler';


export class NgsildDataSource extends DataSourceApi<NgsildQuery, NgsildSourceOptions> {

  private readonly baseUrl: string;  // http://broker:1026/ngsi-ld/v1
  private readonly timeseriesUrl: string;  // http://broker-ts:8080
  private readonly contextUrl: string; // http://context/ngsi-context.jsonld
  private readonly contextLinkHeader: string; // <http://context/ngsi-context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json

  constructor(instanceSettings: DataSourceInstanceSettings<NgsildSourceOptions>) {
    super(instanceSettings);
    let baseUrl = instanceSettings.url || "";
    if (baseUrl.indexOf("/ngsi-ld/v1") < 0)
      {baseUrl = JsUtils.concatPaths(baseUrl, "/ngsi-ld/v1");}
    this.baseUrl = baseUrl;
    const actualTimeseriesUrl: string = instanceSettings.jsonData?.timeseriesUrl || "";
    // note: the route alias "temporal" for instanceSettings.jsonData.timeseriesUrl in the backend proxy 
    // is defined in plugin.json, see https://community.grafana.com/t/grafana-datasource-backend-proxy/6861/4
    // it is a bit strange though that we need to prepend the broker url for this
    const timeseriesUrl: string = instanceSettings.access === "proxy" ? 
      JsUtils.concatPaths(instanceSettings.url?.replace("/ngsi-ld/v1", "")||"", "temporal") : actualTimeseriesUrl; 
    this.timeseriesUrl = timeseriesUrl;
    this.contextUrl = instanceSettings.jsonData?.contextUrl || "";
    this.contextLinkHeader = !this.contextUrl ? "" :
      "<" + this.contextUrl + ">; rel=\"http://www.w3.org/ns/json-ld#context\"; type=\"application/ld+json\"";
  }

  async query(options: DataQueryRequest<NgsildQuery>): Promise<DataQueryResponse> {
    const backend: BackendSrv = getBackendSrv();
    const {range} = options; 
    const data0: Array<Promise<MutableDataFrame[]>> = options.targets!.map((target: NgsildQuery) => this.querySingle(defaults(target, defaultQuery), 
        {backend: backend, from: range?.from?.valueOf(), to: range?.to?.valueOf()}));
    const frames: MutableDataFrame[] = (await Promise.all(data0))
      .filter(f => f?.length > 0)
      .flatMap(f => f);
    return { data: frames };
  }

  // it is somewhat ugly that we need to create multiple data fromes from a single request,
  // but different attributes may not be time-aligned, so there is little we can do
  private async querySingle(query: NgsildQuery, options?: {backend?: BackendSrv, from?: number, to?: number;}): Promise<MutableDataFrame[]> {
    if (!query.entityType&&!query.entityId&&!(query.attributes?.length! > 0))
      {return [];}
    let results: EntityTemporal|EntityTemporal[]|Entity|Entity[] = await this.request(query, options);
    if (!Array.isArray(results))
      {results = [results] as any;}
    if (query.queryType === NgsildQueryType.GEO)
      {return [GeoHandler.handleGeoResult(results as Entity[], query)];}
    if (query.queryType === NgsildQueryType.NODE_GRAPH)
      {return new NodeGraphHandler(this, query).handleGraphResult(results as Entity[], 4);} // TODO max depth
    const frames: MutableDataFrame[] = [];
    for (const result of results as any) {
      const namePattern: NamePattern = namePatternFromValue(query.namePattern);
      const nameField: string = 
          (namePattern !== NamePattern.ATTRIBUTE && query.entityName !== "id" && query.entityName !== "id_short" && !!query.entityName && query.entityName in result) ? query.entityName : "id";
      let name: string = namePattern === NamePattern.ATTRIBUTE ? "" : (getValue(result[nameField] as any)?.toString() || result.id);
      const useShortEntityId: boolean = query.entityName === "id_short" || (query.entityName === undefined && !query.useLongEntityName);
      if (useShortEntityId) {
        const col: number = name.lastIndexOf(":");
        if (col >= 0 && col < name.length-1)
          {name = name.substring(col + 1);} // avoid lengthy expanded names
      }
      if (namePattern === NamePattern.ENTITY_PLUS_ATTRIBUTE)
        {name += ":"}
      const attributes: string[] = Object.keys(result);
      const invalidAttributes = [...INVALID_ATTRIBUTES];
      if (nameField !== "id")
        {invalidAttributes.push(nameField);}
      invalidAttributes.forEach(key => {
        const idx: number = attributes.indexOf(key);
        if (idx >= 0)
          {attributes.splice(idx, 1);}
      });
      for (const attribute of attributes) {
        if (result[attribute].type === "Relationship")
          {continue;}
        const attrName: string = namePattern === NamePattern.ENTITY_NAME ? name : name + attribute
        if (result[attribute].values) {
          const data: Measurement[] = result[attribute].values;
          const field = { 
            name:  attrName, 
            values: data.map(point => point[0]), 
            type: FieldType.number 
          };
          const time = { 
            name: "Time", 
            values: data.map(point => new Date(point[1]).getTime()), // in case of aggregated values there is another entry, period end time interval point[2]
            type: FieldType.time 
          };
          frames.push(new MutableDataFrame({
            refId: query.refId,
            fields: [time, field]
          }));
        } else if (result[attribute].value !== undefined) {
          let value: any = result[attribute].value;
          if (typeof value === "object" && "@value" in value)
            {value = value["@value"];}
          const type: FieldType = isNumber(value) ? FieldType.number : typeof value === "string" ? FieldType.string:
              value === false || value === true ? FieldType.boolean : FieldType.other; 
          const field = { 
            name:  attrName, 
            values: [value], 
            type: FieldType.number 
          };
          const t: number = isFinite(result[attribute].observedAt) ? result[attribute].observedAt : 
            isFinite(options?.from!) && isFinite(options?.to!) ? (options?.from! + options?.to!)/2 :
            isFinite(options?.from!) ? options?.from : isFinite(options?.to!) ? options!.to : Date.now();
          const time = { 
            name: "Time", 
            values: [t], 
            type: FieldType.time 
          };
          frames.push(new MutableDataFrame({
            refId: query.refId,
            fields: [time,field]
          }));
        }
      }
    }
    return frames;
  }

  async request<T=any>(
      query: Omit<NgsildQuery, "refId">, 
      options?: { 
        backend?: BackendSrv, 
        from?: number, 
        to?: number; 
        limit?: number;
        offset?: number;
        lastN?: number;
      }): Promise<T> {
    const backend: BackendSrv = options?.backend || getBackendSrv();
    let endpoint: string;
    const ngsildOptionsParam: string[] = [];
    switch (query.queryType) {
    case NgsildQueryType.TEMPORAL:
      endpoint = "/temporal/entities";
      if (query.entityId)
        {endpoint += "/" + encodeURIComponent(query.entityId);}
      ngsildOptionsParam.push("temporalValues"); // make sure to query the simplified temporal representation
      if (query.aggrMethod) {
        ngsildOptionsParam.push("aggregatedValues"); // 
        endpoint = JsUtils.appendQueryParam(endpoint, "aggrMethod=" + query.aggrMethod);
        if (query.aggrPeriodDuration)
          {endpoint = JsUtils.appendQueryParam(endpoint, "aggrPeriodDuration=" + query.aggrPeriodDuration);}
      }
      break;
    case NgsildQueryType.VERSION:
      endpoint = "/version";
      break;
    case NgsildQueryType.TYPES:
      endpoint = "/types?details=true";
      break;
    case NgsildQueryType.ATTRIBUTES:
      if (!query.entityId) {
        endpoint = "/attributes";
        break;
      }
      // fallthrough
    case NgsildQueryType.GEO:
    case NgsildQueryType.NODE_GRAPH:
    case NgsildQueryType.ENTITY:
      endpoint = "/entities";
      if (query.entityId) {
        const hasComma: boolean = query.entityId.indexOf(",")>=0;
        if (hasComma)
          {endpoint += "?id=" + query.entityId.split(",").map(id=>id.trim()).filter(id=>id).map(encodeURIComponent).join(",");}
        else
          {endpoint += "/" + /*encodeURIComponent(*/query.entityId/*)*/;} // note: encoding does not work with the backend proxy
      }
      if (query.queryType === NgsildQueryType.GEO) {
        if (query.attributes?.length!>0) {
          if (query.attributes!.indexOf("location") < 0)
            {query.attributes!.push("location");}
        } else {
          endpoint = JsUtils.appendQueryParam(endpoint, "q=location");
        }
      }
      else if (query.queryType === NgsildQueryType.NODE_GRAPH) {
        let attributes: string[] = query.attributes || [];
        const addAttributes = (statAttributes?: Record<string, string[]>) => {
          if (!statAttributes)
            {return;}
          attributes.push(...new Set(Object.values(statAttributes).flatMap(arr => arr)));
        }
        addAttributes(query.primaryNodeAttributes);
        addAttributes(query.secondaryNodeAttributes);
        addAttributes(query.arcColorNodeAttributes);
        attributes = [...new Set(attributes)]; // keep only unique values
        if (attributes.length > 0)
          {query.attributes = attributes;}
      }
      break;
    default:
      throw new Error("Invalid query type " + query.queryType);
    }
    if (query.entityType)
      {endpoint = JsUtils.appendQueryParam(endpoint, "type=" + encodeURIComponent(query.entityType));}
    if (query.attributes?.length!>0) {
      if (query.namePattern !== NamePattern.ATTRIBUTE.valueOf() && !!query.entityName && query.entityName !== "id" && query.entityName !== "id_short")
        {query.attributes?.push(query.entityName);}
      endpoint = JsUtils.appendQueryParam(endpoint, "attrs=" + query.attributes?.map(encodeURIComponent).join(","));
    }
    if (query.queryType === NgsildQueryType.TEMPORAL)
      {endpoint = NgsildDataSource.setTimeInterval(endpoint, options?.from, options?.to);}
    if (query.georel) {
      endpoint = JsUtils.appendQueryParam(endpoint, "georel=" + encodeURIComponent(query.georel));
      if (query.geometry)
        {endpoint = JsUtils.appendQueryParam(endpoint, "geometry=" + encodeURIComponent(query.geometry));}
      if (query.coordinates)
        {endpoint = JsUtils.appendQueryParam(endpoint, "coordinates=" + encodeURIComponent(query.coordinates));}
      if (query.geoproperty)
        {endpoint = JsUtils.appendQueryParam(endpoint, "geoproperty=" + encodeURIComponent(query.geoproperty));}
    }
    if (query.customQuery)
      {endpoint = JsUtils.appendQueryParam(endpoint, "q=" + encodeURIComponent(query.customQuery));}

    const appendNumericParam = (url: string, key: string, value?: number): string => 
        isFinite(value!) ? JsUtils.appendQueryParam(url, encodeURIComponent(key) + "=" + encodeURIComponent(value as any)) : url;
    const appendAll = (url: string, params: Record<string, number|undefined>, keys: string[]): string => {
      for (const key of keys) {
        url = appendNumericParam(url, key, params[key]);
      }
      return url;
    }
    if (options)
      {endpoint = appendAll(endpoint, options as any, ["limit", "offset", "lastN"]);}
    if (ngsildOptionsParam.length > 0)
      {endpoint = JsUtils.appendQueryParam(endpoint, "options=" + ngsildOptionsParam.join(","))}
    const baseUrl = query.queryType === NgsildQueryType.VERSION ? this.baseUrl.replace("/ngsi-ld/v1", "") : 
      query.queryType === NgsildQueryType.TEMPORAL ? this.timeseriesUrl :  this.baseUrl;
    const url: string = JsUtils.concatPaths(baseUrl, endpoint);
    const fetchOptions: BackendSrvRequest = {
      method: "GET",
      url: url,
      responseType: "json",
      headers: {Accept: "application/json"}
    };
    if (this.contextUrl && query.queryType !== NgsildQueryType.VERSION) {
      fetchOptions.headers = {
        Link: this.contextLinkHeader,
        Accept: "application/ld+json"
      };
    }
    const result0: T = await NgsildDataSource.toPromise(backend.fetch(fetchOptions));
    return result0;
  }

  private static setTimeInterval(url: string, from?: number, to?: number): string {
    // @ts-ignore
    const hasFrom: boolean = isFinite(from);
    // @ts-ignore
    const hasTo: boolean = isFinite(to);
    if (hasFrom||hasTo) {
      const timerel = (hasFrom&&hasTo) ? "between" : hasFrom ? "after" : "before";
      url = JsUtils.appendQueryParam(url, "timerel=" + timerel);
      const timeAt: number = hasFrom ? from! : to!;
      url = JsUtils.appendQueryParam(url, "timeAt=" + new Date(timeAt).toISOString());
      if (hasFrom&&hasTo)
        {url = JsUtils.appendQueryParam(url, "endTimeAt=" + new Date(to!).toISOString());}
    }
    return url;
  }

  async testDatasource() {
    return this.request({queryType: NgsildQueryType.VERSION});
  }

  // TODO would like to use lastValueFrom here, but import is unclear
  private static toPromise<T>(observable: any /* Observable<FetchResponse<T>> */): Promise<T> {
    return new Promise((resolve, reject) => {
      observable.subscribe({
        next: (response: FetchResponse<T>) => {
          if (!response.ok) {
            let message: string = response.status + ": " + response.statusText;
            if (response.data)
              {message += " (" + response.data + ")";}
            reject("Failed to contact data source " + message);
          }
          resolve(response.data);
        },
        error: (e: any) => reject(e)
      })
    });
  }


}
