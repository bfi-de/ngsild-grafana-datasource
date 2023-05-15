import defaults from 'lodash/defaults';

import React, { ChangeEvent, PureComponent } from 'react';
import { InlineFormLabel, Segment, MultiSelect, Checkbox, Select, Input } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { NgsildDataSource } from './datasource';
import { defaultQuery, NgsildSourceOptions, NgsildQuery, NgsildQueryType, queryTypeForValue, TimeseriesAggregationMethod, NamePattern, namePatternFromValue } from './types';
import {  Entity, EntityType, INVALID_ATTRIBUTES } from 'ngsildTypes';
import { GraphQueryEditor } from 'components/GraphQueryEditor';
import { TsAggregationEditor } from 'components/TimeseriesAggregationEditor';
import { AggregationPeriod } from 'AggregationHelper';
import { GeoParamsEditor } from 'components/GeoParamsEditor';

type Props = QueryEditorProps<NgsildDataSource, NgsildQuery, NgsildSourceOptions>;

// contains available options; samples for the recommender system
interface QueryState {
  types?: EntityType[];
  entityIdsByType?: Record<string, string[]>;
  attributesByEntityId?: Record<string, string[]>;
  attributes?: string[];
}

/**
 * TODO
 *   - downsampling option (enabled by default?)
 */
export class QueryEditor extends PureComponent<Props, QueryState> {

  private static readonly EMPTY_OPTION_ID: string = "__EMPTY__";
  private static readonly EMPTY_OPTION: SelectableValue<string> = Object.freeze({name: QueryEditor.EMPTY_OPTION_ID, label: ""});
  private static readonly QUERY_TYPES: Array<SelectableValue<NgsildQueryType>> = [
    {value: NgsildQueryType.TEMPORAL, label: "temporal", description: "Timeseries request", title: "Temporal queries target timeseries data, commonly used in graph plots"},
    {value: NgsildQueryType.ENTITY, label: "current value", description: "Current value request", title: "Query the current value of one or multiple entity attributes"},
    {value: NgsildQueryType.GEO, label: "geo", description: "Geo request", title: "Query the location of entities, useful for map visualizations"},
    {value: NgsildQueryType.NODE_GRAPH, label: "node graph", description: "Node graph request", title: "Retrieve a directed graph dataset for the node graph panel"},
  ];
  private static readonly NAMING_PATTERNS: Array<SelectableValue<NamePattern>> = [
    {value: NamePattern.ENTITY_PLUS_ATTRIBUTE, label: "Entity plus attribute", description: "Entity name plus attribute",
            title: "The datapoint label is composed of the entity name + \":\" + the attribute name." },
    {value: NamePattern.ENTITY_NAME, label: "Entity", description: "Entity name",
            title: "The datapoint label is given by the entity name." },
    {value: NamePattern.ATTRIBUTE, label: "Attribute", description: "Attribute name",
            title: "The datapoint label is given by the attribute name." },
  ];

  constructor(props: Props) {
    super(props);
    this.loadData();
  }

  private loadData(): Promise<unknown> { // initial recommendations
    const prom1 = this.props.datasource.request({queryType: NgsildQueryType.TYPES}) // TODO limit?
      .then((types: EntityType[]) => {
        types.forEach(type => {
          const idx: number = type.typeName?.lastIndexOf(".");
          type.shortName = idx >= 0 && idx < type.typeName.length-1 ? type.typeName.substring(idx+1) : type.typeName;
        });
        return new Promise<EntityType[]>(resolve => this.setState({ types: types }, () => resolve(types)));
      });
    const prom2 = this.props.datasource.request({queryType: NgsildQueryType.ATTRIBUTES})
      .then((attributes: {attributeList: string[]}) => new Promise<void>(resolve => this.setState({ attributes: attributes.attributeList }, resolve)));
    const prom3 = prom1.then(async (types: EntityType[]) => {
      if (types.length > 25)
        {types = types.filter((_, idx) => idx<25);}
      const type: string|undefined = types.length > 0 ? types.map(type => type.typeName).join(",") : undefined;
      // TODO ideally, we'd like to retrieve samples for the different types
      return this.loadEntities(this.props.datasource, type, 100);
    });
    return Promise.all([prom1, prom2, prom3]);
  }

  private async loadEntities(datasource: NgsildDataSource, type?: string, limit?: number) {
    if (!type)
      {return;}
    const typeEntitiesLoaded: boolean = !!this.state?.entityIdsByType && type in this.state.entityIdsByType;
    if (typeEntitiesLoaded)
      {return;}
    const entities: Entity[] = 
        await datasource.request({queryType: NgsildQueryType.ENTITY, entityType: type}, {limit: limit||25});
    if (entities.length === 0)
      {return;}
    const entitiesByType: Record<string, string[]> = 
        this.state?.entityIdsByType ? {...this.state.entityIdsByType} : {};      
    entitiesByType[type] = entities.map(entity => entity.id);
    const attributesById = 
        this.state?.attributesByEntityId ? {...this.state.attributesByEntityId} : {};
    const attributesForEntity = (entity: Entity): string[] => Object.entries(entity).filter(([key, value]) => {
      if (INVALID_ATTRIBUTES.indexOf(key) >= 0)
        {return false;}
      if (!value.value || !isFinite(value.value as any))
        {return false;}
      return true;
    }).map(([key, _]) => key);
    const newAttributesByIds = Object.fromEntries(entities.map(entity => [entity.id, attributesForEntity(entity)]));
    Object.assign(attributesById, newAttributesByIds);
    return new Promise<void>(resolve => this.setState({entityIdsByType: entitiesByType, attributesByEntityId: attributesById}, resolve));
  }

  private async loadAttributes(datasource: NgsildDataSource, entityId?: string) {
    if (!entityId)
      {return;}
    const attributesLoaded: boolean = !!this.state?.attributesByEntityId && entityId in this.state.attributesByEntityId;
    if (attributesLoaded)
      {return;}
    const entity: Entity = await datasource.request({queryType: NgsildQueryType.ENTITY, entityId: entityId});
    if (!entity)
      {return;}
    const attrs: string[] = Object.keys(entity).filter(attr => INVALID_ATTRIBUTES.indexOf(attr) < 0)
    if (attrs.length === 0)
      {return;}
    const attrsByEntity: Record<string, string[]> = 
      this.state?.attributesByEntityId ? {...this.state.attributesByEntityId} : {};
    attrsByEntity[entityId] = attrs;
    this.setState({ attributesByEntityId: attrsByEntity });
  }

  /*
  onMeasurementChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, measurement: event.target.value?.trim() });
    // executes the query
    //onRunQuery();
  };
  */

  static toOption<T>(value: T): SelectableValue<string> {
    // @ts-ignore
    const id: string = value.id || value.name || value + "";
      // @ts-ignore
    const name = value.name || id;
    // @ts-ignore
    const title: string|undefined = value.description || undefined;
    return {
      value: id,
      label: name,
      description: title,
      title: title
    };
    //return this.props.datasource.uiSegmentSrv.getSegmentForValue(value);
  }

  getEntityTypes(): Array<SelectableValue<string>> {
    if (!this.state?.types) {
      return [];
    }
    const types = this.state.types
      .map(type => {return {id: type.typeName, name: type.shortName, description: type.typeName};})
      .map(QueryEditor.toOption)
      .sort();
    types.unshift(QueryEditor.EMPTY_OPTION);
    return types;
  }

  getEntityIds(entityType?: string): Array<SelectableValue<string>> {
    if (!this.state?.entityIdsByType)
      {return [];}
    if (!entityType) {
      const result: Array<SelectableValue<string>> = [];
      const entities: string[][] = Object.values(this.state.entityIdsByType);
      const maxLength: number = entities.reduce((m, a2) => Math.max(m, a2.length), 0);
      let cnt = 0;
      outer: for (let arrIdx=0; arrIdx<maxLength; arrIdx++) {
        for (let idx=0; idx<entities.length; idx++) {
          const arr = entities[idx];
          if (arrIdx < arr.length) {
            result.push(QueryEditor.toOption(arr[arrIdx]))
            if (cnt++ > 50)
              {break outer;}
          }
        }
      }
      if (result.length > 0)
        {result.unshift(QueryEditor.EMPTY_OPTION);}
      return result;
    }
    if (this.state?.entityIdsByType && entityType in this.state.entityIdsByType) {
      const arr = this.state.entityIdsByType[entityType].map(QueryEditor.toOption);
      if (arr.length > 0)
        {arr.unshift(QueryEditor.EMPTY_OPTION);}
      return arr;
    }
    return [];
  }

  getAttributes(entityType?: string, entityId?: string, queryType?: NgsildQueryType, addEmpty?: boolean): Array<SelectableValue<string>> {
    const attribs = this.getAttributesInternal(entityType, entityId, queryType);
    if (addEmpty && attribs.length > 0)
      {attribs.unshift(QueryEditor.EMPTY_OPTION);}
    return attribs;
  }

  private getEntityNameFields(entityType?: string, entityId?: string) {
    const attributes: Array<SelectableValue<string>> = this.getAttributes(entityType, entityId);
    const nameIdx = attributes.findIndex(v => v.value === "name");
    if (nameIdx > 0) {
      const nameSelection = attributes.splice(nameIdx, 1);
      attributes.unshift(nameSelection[0]);
    }     
    attributes.unshift({value: "id", label: "id", description: "Entity id", title: "Use the entity id as the entity name."});
    attributes.unshift({value: "id_short", label: "id (short)", description: "Short entity id", title: "Use the short form of the entity id as the entity name."});
    return attributes;
  }

  private getAttributesInternal(entityType?: string, entityId?: string, queryType?: NgsildQueryType): Array<SelectableValue<string>> {
    if (queryType === NgsildQueryType.NODE_GRAPH) {  //  in the case of graph queries we should display all available attributes // TODO maybe show those applicable to entity type first?
      if (this.state?.attributes?.length! > 0)
        {return this.state.attributes!.map(QueryEditor.toOption).sort();}
      if (this.state?.attributesByEntityId) {
        return [...new Set(Object.values(this.state.attributesByEntityId).flatMap(arr => arr))].map(QueryEditor.toOption).sort();
      }
    }
    if (entityId && this.state?.attributesByEntityId && entityId in this.state.attributesByEntityId)
        {return this.state.attributesByEntityId[entityId].map(QueryEditor.toOption).sort();}
    if (entityType) {
      const types: EntityType[]|undefined = 
        entityType ? this.state?.types?.filter(type => type.typeName === entityType) : undefined;
      if (types)
        {return [... new Set(types.flatMap((x) => x.attributeNames))].map(QueryEditor.toOption).sort();}
    }
    return (this.state?.attributes || []).map(QueryEditor.toOption).sort();
  }

  onEntityTypeChange = (event: SelectableValue<string>) => {
    const { onChange, query, datasource } = this.props;
    let type: string = event.value?.trim() || "";
    if (type === QueryEditor.EMPTY_OPTION_ID)
      {type = "";}
    this.loadEntities(datasource, type);
    if (type)
      {onChange({ ...query, entityType: type, entityId: undefined, attributes: undefined });}
    else
      {onChange({ ...query, entityType: type });}
  };

  onEntityNameFieldChange = (event: SelectableValue<string>) => {
    const { onChange, query } = this.props;
    const name = event.value?.trim() || "id_short";
    onChange({...query, entityName: name});
  }


  onAttributeChange = (event: Array<SelectableValue<string>>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, attributes: event.map(e => {
      let attr: string = e.value?.trim() || "";
      if (attr === QueryEditor.EMPTY_OPTION_ID)
        {attr = "";}
      return attr;
    }).filter(e => e)});
  };

  onQueryTypeChange = (event: SelectableValue<NgsildQueryType>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, queryType: event?.value?.valueOf()||""});
  };

  onEntityIdChange = (event: SelectableValue<string>) => {
    let id: string = event.value?.trim() || ""; 
    if (id === QueryEditor.EMPTY_OPTION_ID)
      {id = "";}
    const { onChange, query, datasource } = this.props;
    this.loadAttributes(datasource, id);
    if (id) 
      {onChange({ ...query, entityId: id, attributes: [] });} // TODO keep attributes selected that are applicable to the entity at hand?
    else
      {onChange({ ...query, entityId: id });}

  };

  onCustomQueryChange = (q: string|undefined) => {
    const { onChange, query } = this.props;
    onChange({ ...query, customQuery: q?.trim() || ""});
  };

  onLongEntityNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, useLongEntityName: event.currentTarget.checked });
  };

  onNamePatternChange = (event: SelectableValue<NamePattern>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, namePattern: event?.value?.valueOf() || NamePattern.ENTITY_PLUS_ATTRIBUTE.valueOf()});
  };

  onGraphAttributesChanged = (kind: "primary"|"secondary"|"arcColor", attributes: Record<string, string[]>|undefined) => {
    const { onChange, query } = this.props;
    const key: string = kind + "NodeAttributes";
    onChange({...query, [key]: attributes });
  }
  
  onGraphColorChanged = (primaryOrSecondary: boolean, color?: string) => {
    const { onChange, query } = this.props;
    const key: string = (primaryOrSecondary ? "primary" : "secondary") + "ArcColor";
    onChange({...query, [key]: color });
  }

  onArcColorComplementChanged = (label?: string) => {
    const { onChange, query } = this.props;
    onChange({...query, arcColorComplementLabel: label });
  }

  onAggregationMethodChanged = (aggrMethod: TimeseriesAggregationMethod[]) => {
    const { onChange, query } = this.props;
    const serialized: string|undefined = aggrMethod.length > 0 ? aggrMethod.map(m => m.valueOf()).join(",")  : undefined;
    onChange({...query, aggrMethod: serialized });
  }

  onAggregationPeriodChanged = (aggrPeriod: AggregationPeriod) => {
    const { onChange, query } = this.props;
    onChange({...query, aggrPeriodDuration: aggrPeriod.serialize() });
  }

  onGeoChanged = (geo: {georel?: string, geometry?: string, coordinates?: string, geoproperty?: string}) => {
    const { onChange, query } = this.props;
    onChange({...query, georel: geo?.georel, geometry: geo?.geometry||"Point", coordinates: geo?.coordinates, geoproperty: geo?.geoproperty||"location" });
  }

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { entityId, entityType, attributes, namePattern, entityName, useLongEntityName, queryType, customQuery } = query;
    const queryType0: NgsildQueryType = queryTypeForValue(queryType)!;
    const namePattern0: NamePattern = namePatternFromValue(namePattern)
    const entityName0: string = !!entityName ? entityName : (useLongEntityName ? "id" : "id_short");
    let namePatternSelector = <React.Fragment></React.Fragment>;
    if (queryType !== NgsildQueryType.NODE_GRAPH && queryType !== NgsildQueryType.GEO) {
      namePatternSelector = <div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel width={12} tooltip="Select the naming pattern for the datapoints">
            Naming pattern
          </InlineFormLabel>              
          <Select<NamePattern>
            options={QueryEditor.NAMING_PATTERNS}
            value={namePattern0}
            onChange={this.onNamePatternChange}
            width={22}
            ></Select>
        </div>
      </div>;
    }
    let entityNameFieldSelector = <React.Fragment></React.Fragment>;
    if (namePattern0 !== NamePattern.ATTRIBUTE || queryType === NgsildQueryType.NODE_GRAPH || queryType === NgsildQueryType.GEO) {
      entityNameFieldSelector = <
        div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel width={12} tooltip="Select the attribute that determines the entity name.">
            Entity name
          </InlineFormLabel>              
          <Segment<string>
            value={entityName0 || ""}
            onChange={this.onEntityNameFieldChange}
            options={this.getEntityNameFields(entityType)}
            inputMinWidth={20}
            allowCustomValue
          ></Segment>
        </div>
      </div>;
    }
    let graphEditor = <React.Fragment></React.Fragment>;
    if (queryType === NgsildQueryType.NODE_GRAPH) {
      const {primaryNodeAttributes, secondaryNodeAttributes, arcColorNodeAttributes, primaryArcColor, secondaryArcColor, arcColorComplementLabel } = query;
      graphEditor = <GraphQueryEditor
          primaryNodeAttributes={primaryNodeAttributes}
          secondaryNodeAttributes={secondaryNodeAttributes}
          arcColorNodeAttributes={arcColorNodeAttributes}
          arcColorComplementLabel={arcColorComplementLabel}
          primaryArcColor={primaryArcColor}
          secondaryArcColor={secondaryArcColor}
          proposedAttributes={this.getAttributes(entityType, entityId, queryType, true)}
          attributesChanged={this.onGraphAttributesChanged}
          onColorChanged={this.onGraphColorChanged}
          onArcColorComplementChanged={this.onArcColorComplementChanged}
        ></GraphQueryEditor>;
    }
    let temporalAggregationEditor  = <React.Fragment></React.Fragment>;
    if (queryType === NgsildQueryType.TEMPORAL) {
        const {aggrMethod, aggrPeriodDuration }  = query;
        temporalAggregationEditor = <TsAggregationEditor
          aggrMethod={aggrMethod}
          aggrPeriodDuration={aggrPeriodDuration}
          onAggregationMethodChanged={this.onAggregationMethodChanged}
          onAggregationPeriodChanged={this.onAggregationPeriodChanged}
          ></TsAggregationEditor>
    }
    const {georel, geometry, geoproperty, coordinates} = query;
    const geoEditor = <GeoParamsEditor
      georel={georel}
      geometry={geometry}
      geoproperty={geoproperty}
      coordinates={coordinates}
      onGeoChanged={this.onGeoChanged}
    ></GeoParamsEditor>
    return (
      <div style={{display: "flex", columnGap: "1.5em", rowGap: "1em", flexWrap: "wrap"}}>
        <div>
          <h6>Basic settings and filters</h6>
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel width={12} tooltip="Query type">
                Query type
              </InlineFormLabel>
              <Select<NgsildQueryType>
                options={QueryEditor.QUERY_TYPES}
                value={queryType0}
                onChange={this.onQueryTypeChange}
                width={22}
                ></Select>
            </div>
          </div>
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel width={12} tooltip="Select the entity type">
                Entity type
              </InlineFormLabel>
              <Segment<string>
                value={entityType || ""}
                onChange={this.onEntityTypeChange}
                options={this.getEntityTypes()}
                inputMinWidth={12}
                allowCustomValue
              ></Segment>
            </div>
          </div>
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel width={12} tooltip="Select the entity id">
                Entity id
              </InlineFormLabel>              
              <Segment<string>
                value={entityId || ""}
                onChange={this.onEntityIdChange}
                options={this.getEntityIds(entityType)}
                inputMinWidth={12}
                allowCustomValue
              ></Segment>
            </div>
          </div>
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel width={12} tooltip="Attributes to include">
                Attributes
              </InlineFormLabel>
              <MultiSelect<string>
                options={this.getAttributes(entityType, entityId, queryType0)}
                value={attributes}
                onChange={this.onAttributeChange}
                width={22}
                ></MultiSelect>
            </div>
          </div>
          <div className="gf-form-inline">
            <div className="gf-form">
            <InlineFormLabel width={12} tooltip="A query string conforming to the NGSI-LD query language, such as speed>50;brandName!='Mercedes'">
                Custom query
              </InlineFormLabel>
              <Input
                value={customQuery || ""}
                onChange={evt => this.onCustomQueryChange(evt.currentTarget.value)}
                type="string"
                placeholder={"speed>50;brandName!=\"Mercedes\""}
                width={22}
              ></Input>
            </div>
          </div>
          {namePatternSelector}
          {entityNameFieldSelector}
        </div>  
        <div>
          {geoEditor}
        </div>  
        <div>
          {graphEditor}
        </div>  
        <div>
          {temporalAggregationEditor}
        </div>
      </div>
    );
    /*
      deprecated:
      <div className="gf-form-inline">
        <div className="gf-form">
          <Checkbox
            value={useLongEntityName || false}
            onChange={this.onLongEntityNameChange}
            label="Long entity names"
            description="Show the fully qualified entity name?"
          />
        </div>
      </div>
    */

  }
}
