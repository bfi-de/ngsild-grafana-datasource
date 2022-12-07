import { FieldDTO, FieldType, MutableDataFrame, NodeGraphDataFrameFieldNames } from "@grafana/data";
import { NgsildDataSource } from "datasource";
import { Entity, getValue, getValueWithUnit, Property, Relationship } from "ngsildTypes";
import { NgsildQuery, NgsildQueryType } from "types";
import { units } from "units";

/*
  Graph panel documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/
    - "Data source needs to return two data frames, one for nodes and one for edges. You have to set frame.meta.preferredVisualisationType = 'nodeGraph' 
       on both data frames or name them nodes and edges respectively for the node graph to render."
*/
export class NodeGraphHandler {

    constructor(
        private readonly datasource: NgsildDataSource, 
        private readonly query: NgsildQuery) {}


    // TODO move maxGraphDepth to NgsildQuery! 
    async handleGraphResult(entities: Entity[], maxGraphDepth: number): Promise<[MutableDataFrame, MutableDataFrame]> {
        entities = await this.resolveMissingEntities(entities, maxGraphDepth);
        const entityLabel = (entity: Entity) => {
            let id: string = entity.id;
            if (this.query.useLongEntityName)
                {return id;}
            const col: number = id.lastIndexOf(":");
            return col > 0 && col<id.length-1 ? id.substring(col+1) : id;
        };
        const nodeIdField: FieldDTO = { name: "id", values: [], type: FieldType.string };
        const nodeTitleField: FieldDTO = { name: "title", values: [], type: FieldType.string };
        const nodeSubTitleField: FieldDTO = { name: "suntitle", values: [], type: FieldType.string };
        const nodeMainStatField: FieldDTO = { name: "mainStat", values: [], type: FieldType.string, config: {/*displayName: "Test" , unit: "test", color: "sdds"*/} };  // TODO unit and color, etc
        const nodeSecondaryStatField: FieldDTO = { name: "secondaryStat", values: [], type: FieldType.string, config: {} };
        // TODO configurable color
        const nodeArcField1: FieldDTO  = {name: "arc__zone1", values: [], type:FieldType.number, config: {color: {mode: "fixed", fixedColor: "green"} }};
        const nodeArcField2: FieldDTO  = {name: "arc__zone2", values: [], type:FieldType.number, config: {color: {mode: "fixed", fixedColor: "red"} }};
        const nodeArcFieldNeutral: FieldDTO  = {name: "arc__neutral", values: [], type:FieldType.number, config: {displayName: "n.a." }};
        const getStatValue = (entity: Entity, statAttributes?: Record<string, string[]>, options?: {returnAttribute?: boolean, skipUnit?: boolean}): any => {
            if (!statAttributes)
                {return undefined;}
            const attributes: string[]|undefined = statAttributes[entity.type] || statAttributes[""];
            if (!attributes)
                {return undefined;}
            const selectedAttr: string|undefined = attributes.find(attr => attr in entity);
            if (!selectedAttr)
                {return undefined;}
            if (options?.returnAttribute)
                {return selectedAttr;}
            let property = entity[selectedAttr];
            if (Array.isArray(property) && property.length > 0)
                {property = property[0];}
            const value: any = options?.skipUnit ? getValue(property as Property<unknown>) : getValueWithUnit(property as Property<unknown>);
            return /*value !== undefined ? selectedAttr + ": " + value  : */value;
        };
        const setFieldConfig = (field: FieldDTO, statAttributes?: Record<string, string[]>) => {
            if (!statAttributes)
                {return;}
            const entity = entities.find(e => getStatValue(e, statAttributes, {returnAttribute: true}));
            if (entity) {
                const attr = getStatValue(entity, statAttributes, {returnAttribute: true});
                field.config!.displayName = attr;
                 /*
                const value0: Property<unknown>|Array<Property<unknown>> = entity[attr] as any;
                const value: Property<unknown>|undefined = Array.isArray(value0) ? (value0.length > 0 ? value0[0] : undefined) : value0; 
                if (value?.unitCode) { // FIXME first convert it to a human-readable unit 
                    field.config!.unit = units[value.unitCode] || value.unitCode;
                }
                */
            }
        }
        setFieldConfig(nodeMainStatField, this.query.primaryNodeAttributes); // TODO color?
        setFieldConfig(nodeSecondaryStatField, this.query.secondaryNodeAttributes);
        //setFieldConfig(nodeArcField1, this.query.arcColorNodeAttributes);
        if (this.query.arcColorNodeAttributes) {
            const entity = entities.find(e => getStatValue(e, this.query.arcColorNodeAttributes, {returnAttribute: true}));
            if (entity) {
                const attr = getStatValue(entity, this.query.arcColorNodeAttributes, {returnAttribute: true});
                nodeArcField1.config!.displayName = attr;
                nodeArcField2.config!.displayName = this.query.arcColorComplementLabel || ("~" + attr);
                if (this.query.primaryArcColor)
                    {nodeArcField1.config!.color!.fixedColor = this.query.primaryArcColor;}
                if (this.query.secondaryArcColor)
                    {nodeArcField2.config!.color!.fixedColor =  this.query.secondaryArcColor;}
            }
        }

        entities.forEach(entity => {
            const label: string = entityLabel(entity);
            let type: string = entity.type;
            const dot: number = type.lastIndexOf(".");
            if (dot >= 0 && dot < type.length-1) {
                type = type.substring(dot+1);
            }
            const subtitle = label.indexOf(type) >= 0 ? "" : type;
            (nodeIdField.values as string[]).push(entity.id);
            (nodeTitleField.values as string[]).push(label);
            (nodeSubTitleField.values as string[]).push(subtitle);
            (nodeMainStatField.values as any[]).push(getStatValue(entity, this.query?.primaryNodeAttributes));
            (nodeSecondaryStatField.values as any[]).push(getStatValue(entity, this.query?.secondaryNodeAttributes));

            const arcStatValue: number = getStatValue(entity, this.query?.arcColorNodeAttributes, {skipUnit: true});
            const complementArcState = 1-arcStatValue;
            const neutralArcState = isFinite(arcStatValue) ? 0 : 1;
            (nodeArcField1.values as any[]).push(arcStatValue);
            (nodeArcField2.values as any[]).push(complementArcState);
            (nodeArcFieldNeutral.values as any[]).push(neutralArcState);
        });
        const edgeIdField: FieldDTO = { name: "id", values: [], type: FieldType.string };
        const edgeSourceField: FieldDTO = { name: "source", values: [], type: FieldType.string };
        const edgeTargetField: FieldDTO = { name: "target", values: [], type: FieldType.string };
        const edgeMainStatField: FieldDTO = { name: "mainStat", values: []  }; // can be string or number
        for (const entity of entities) {
            const relationships: Array<[string, Relationship]> = Object.entries(entity)
                .filter(([attribute, value]) => value?.type === "Relationship" && value?.object !== undefined && entities.find(entity2 => entity2.id === value.object) !== undefined);
            relationships.forEach(([attr, relationship]) => {
                (edgeIdField.values as string[]).push(entity.id + "__" + attr);
                (edgeSourceField.values as string[]).push(entity.id);
                (edgeTargetField.values as string[]).push(relationship.object);
                (edgeMainStatField.values as string[]).push(attr);
            });
        }
        const nodeFields = [nodeIdField, nodeTitleField, nodeSubTitleField];
        if (this.query.primaryNodeAttributes)
            {nodeFields.push(nodeMainStatField);}
        if (this.query.secondaryNodeAttributes)
            {nodeFields.push(nodeSecondaryStatField);}
        if (this.query.arcColorNodeAttributes) {
            nodeFields.push(nodeArcField1, nodeArcField2);
            if ((nodeArcFieldNeutral.values as number[]).findIndex(n => n > 0) >= 0)
                {nodeFields.push(nodeArcFieldNeutral);}
        }
        const nodes: MutableDataFrame = new MutableDataFrame({
            refId: this.query.refId,
            fields: nodeFields,   
            meta: {preferredVisualisationType: "nodeGraph"},
            name: "nodes"
        });
        const edges: MutableDataFrame = new MutableDataFrame({
            refId: this.query.refId,
            fields: [edgeIdField, edgeSourceField, edgeTargetField, edgeMainStatField],  
            meta: {preferredVisualisationType: "nodeGraph"},
            name: "edges"
        });
        return [nodes, edges];
    }

    private async resolveMissingEntities(entities: Entity[], depthCnt: number, startIdx = 0): Promise<Entity[]> {
        if (depthCnt <= 0)
            {return entities;}
        const missingEntities: Set<string> = new Set();
        for (let idx=startIdx; idx<entities.length; idx++) {
            const entity = entities[idx];
            const relationships: Array<[string, Relationship]> = Object.entries(entity)
                .filter(([attribute, value]) => value?.type === "Relationship" && value?.object !== undefined);
            const missing: string[] = relationships.map(([attr, target]) => target.object).filter(target => entities.find(entity2 => entity2.id === target) === undefined);
            missing.forEach(id => missingEntities.add(id));
        }
        // request multiple entities in a single go
        const newEntities: Entity[] = await this.getEntites(missingEntities);
        if (newEntities.length === 0)
            {return entities;}
        const newStartIdx: number = entities.length;
        entities.push(...newEntities);
        const recursiveEntities: Entity[] = await this.resolveMissingEntities(entities, depthCnt--, newStartIdx);
        return recursiveEntities;
    }

    private async getEntites(ids: Set<string>): Promise<Entity[]> {
        if (ids.size === 0)
            {return [];}
        const entityId: string = [...ids].join(",");
        let additionalEntities: Entity|Entity[] = await this.datasource.request({queryType: NgsildQueryType.ENTITY, entityId: entityId});
        if (!additionalEntities)
            {return [];}
        if (!Array.isArray(additionalEntities))
            {additionalEntities = [additionalEntities];}
        return additionalEntities;
    }

}



