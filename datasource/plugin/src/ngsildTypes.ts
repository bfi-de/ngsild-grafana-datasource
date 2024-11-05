import { units } from "units";

/* [value, iso datetime] */
export type Measurement = [number, string];

export type TemporalPropertyKey = "observedAt"|"createdAt"|"modifiedAt"|"deletedAt";

export type EntityTemporal<V = any> = Omit<{
    [attribute: string]: {
        type: "Property"|"Relationship";
        values: Measurement[];
    } | Array<Property<V>>;
}, "id"|"type"|"@context"|TemporalPropertyKey>&{
    id: string; // the entity id
    type: string; // entity type
    "@context": any;
}

export interface EntityType {
    typeName: string;
    attributeNames: string[]; /* XXX cannot provide any static metadata here */
    shortName?: string; 
}

export type Value<V> = V|{"@value": V};

export type TemporalProperty = {
    /** The string value is actually of Date format */
    [temporal in TemporalPropertyKey]?: string;
}

// the type is not exact, we would need an omit here around the first type, but this leads to an error 
// due to circular references; furthermore non-rectified properties look simpler than that. 
// This is rather a first order approximation.
export type Property<V=any> = {
    [attribute: string]: Property|Relationship|Property[]|Relationship[];
} & {
    type: "Property";
    value: Value<V>;
    unitCode?: string;
    datasetId?: string;
}&TemporalProperty;

export type Relationship = {
    [attribute: string]: Property|Relationship|Property[]|Relationship[];
} & {
    type: "Relationship";
    object: string;
    observedAt?: string;
    datasetId?: string;
}&TemporalProperty;

export const getValue = <V>(property: Property<V>|Array<Property<V>>): any => {
    if (property === undefined || property === null)
        {return undefined;}
    if (typeof property !== "object")
        {return property;}
    if (Array.isArray(property))
        {return property.map(getValue);}
    if (property?.value === undefined)
        {return undefined;}
    if (typeof property.value === "object" && "@value" in property.value!)
        {return property.value["@value"];}
    return property.value;
}

export const getValueWithUnit = <V>(property: Property<V>) => {
    let v: any = getValue(property);
    if (isFinite(v) && typeof property === "object") {
        let unit = property.unitCode;
        if (unit) {
            unit = units[unit] || unit;
            v = v + (unit.startsWith("°") ? "": " ") + unit;
        }
    }
    return v;
}

/* [longitude, latitude], in degrees */
export type GeoCoordinates = [number, number];
export type GeoPoint = {
    type: "Point";
    coordinates: GeoCoordinates;
}
export type GeoLineString = {
    type: "LineString";
    coordinates: GeoCoordinates[];
}
export type GeoPolygon = {
    type: "Polygon";
    coordinates: GeoCoordinates[][];
}

export type GeoType = GeoPoint|GeoLineString|GeoPolygon; // TODO others?
export type GeoProperty = Omit<Property<GeoType>, "type">&{type: "GeoProperty"};

export type Attribute = Property|Relationship|GeoProperty;

export type Entity = Omit<{
    [attribute: string]: Attribute|Attribute[];
}, "id"|"type"|"@context">&{
    id: string; // the entity id
    type: string; // entity type
    "@context": any;
    location?: GeoProperty;
}

export const INVALID_ATTRIBUTES: readonly string[] = Object.freeze(["id", "type", "@context"]);

// TODO query language filters
