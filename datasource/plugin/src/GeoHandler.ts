import { MutableDataFrame } from "@grafana/data";
import { Entity, GeoProperty, GeoType, getValue, GeoCoordinates, Property, getValueWithUnit } from "ngsildTypes";

export class GeoHandler {

    static handleGeoResult(entities: Entity[], refId: string): MutableDataFrame {
        let allAttributes: string[] = entities
          .map(result => Object.keys(result))
          .flatMap(attributes => attributes)
          // XXX
          .filter(attribute => attribute !== "@context" && attribute !== "location" && attribute !== "operationSpace" && attribute !== "observationSpace");
        allAttributes = [...new Set(allAttributes)]; // want unique attributes
        const fields: Array<{name: string; values: any[]}>
            = allAttributes.map(attr => {return {name: attr, values: [] } });
        const longitude = {name: "longitude", values: [] as any[]};
        const latitude = {name: "latitude", values: [] as any[]};
        const names = {name: "name", values: [] as any[]};
        entities.forEach((entity: Entity) => {
          const location: GeoProperty = entity.location!;
          const value: GeoType = location?.value as any as GeoType; // XXX imperfection of our typings...
          if (value.type !== "Point") {
            // TODO support more geo types
            console.log("Skipping unsupported geo type", value?.type, "for entity", entity);
            return;
          }
          fields.forEach(field => {
            const value = getValue/*WithUnit*/(entity[field.name] as any); // TODO unit would be preferable, but since we don't know which field may be used for marker sizing we cannot do it
            field.values.push(value); 
          });
          const coordinates: GeoCoordinates = value.coordinates;
          longitude.values.push(coordinates[0]);
          latitude.values.push(coordinates[1]);
          let name: string = entity.id;
          const col: number = name.lastIndexOf(":");
            if (col >= 0 && col < name.length-1)
              {name = name.substring(col + 1);} 
          names.values.push(name);
        });
        [latitude, longitude, names].forEach(f => fields.unshift(f));
        return new MutableDataFrame({
            refId: refId,
            fields: fields
          });
      }

}
