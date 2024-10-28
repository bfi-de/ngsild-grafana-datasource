import { SelectableValue } from '@grafana/data';
import { InlineFormLabel, Input, Segment, Select } from '@grafana/ui';
import React, { PureComponent, ReactNode } from 'react';
import { georelFromValue, GeorelProperty } from 'types';

/**
 * Examples of valid geo queries:
 *   - ?georel=near;maxDistance==2000&geometry=Point&coordinates=[8,40]
 *   - near;maxDistance==2000
 *   - 
 * 
 */
 interface GeoParamsProps {

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
  onGeoChanged(geo: {georel?: string, geometry?: string, coordinates?: string, geoproperty?: string}): void;
}

enum DistanceType {
  MAX_DISTANCE = "maxDistance",
  MIN_DISTANCE = "minDistance"
}


export class GeoParamsEditor extends PureComponent<GeoParamsProps, Readonly<{}>> {

  private static readonly DISTANCE_OPTIONS: Array<SelectableValue<DistanceType>> = [
    {value: DistanceType.MAX_DISTANCE, label: "max radius", description: "Maximum distance from specified point", title: "Maximum distance from specified point (the default)"},
    {value: DistanceType.MIN_DISTANCE, label: "min radius", description: "Minimum distance from specified point", title: "Minimum distance from specified point "},
  ];

  private static readonly GEOREL_OPTIONS: Array<SelectableValue<GeorelProperty>> = [
    {value: GeorelProperty.NONE, label: "none", description: "Disable geo filters", title: "Disable geo filters"},
    {value: GeorelProperty.NEAR, label: "near", description: "Specify a radius for the included points", title: "Specify a radius for the included points"},
    {value: GeorelProperty.EQUALS, label: "equals", description: "Geometries must match exactly", title: "Geometries must match exactly"},
    {value: GeorelProperty.DISJOINT, label: "disjoint", description: "Geometry must lie outside the specified one", title: "Geometry must lie outside the specified one"},
    {value: GeorelProperty.INTERSECTS, label: "intersects", description: "Geometry must intersect the specified one; shared borders are sufficient", title: "Geometry must intersect the specified one; shared borders are sufficient"},
    {value: GeorelProperty.WITHIN, label: "within", description: "Geometries must lie within the specified one", title: "Geometries must lie within the specified one"},
    {value: GeorelProperty.CONTAINS, label: "contains", description: "Geometries must contain the specified one", title: "Geometries must contain the specified one"},
    {value: GeorelProperty.OVERLAPS, label: "overlaps", description: "Geometry must overlap the specified one; does not match on shared borders", title: "Geometry must overlap the specified one; does not match on shared borders"}, 
  ];

  // note: these are just proposals, the user can enter other geometries
  private static readonly GEOMETRY_OPTIONS: Array<SelectableValue<string>> = [
    {value: "Point", label: "Point", description: "A point specified by longitude and latitude", title: "A point specified by longitude and latitude"},
    {value: "LineString", label: "LineString", description: "A line string specified by an array of points", title: "A line string specified by an array of points"},
    {value: "Polygon", label: "Polygon", description: "A polygon specified by an array of line strings", title: "A polygon specified by an array of line strings"},
  ];

  // note: these are just proposals, the user can enter other geometries
  private static readonly GEOPROPERTY_OPTIONS: Array<SelectableValue<string>> = [
    {value: "location", label: "location", description: "The location of an entity (default)", title: "The location of an entity (default)"},
    {value: "observationSpace", label: "observationSpace", description: "The location observed by an entity", title: "The location observed by an entity"},
    {value: "operationSpace", label: "operationSpace", description: "The location in which an entity is active", title: "The location in which an entity is active"},
  ];

  private static buildGeorel(oldGeorel: string|undefined, options: {newType?: GeorelProperty, newDistance?: number, newDistanceType?: DistanceType}): string {
    const type: GeorelProperty = georelFromValue(options.newType || oldGeorel);
    if (type === GeorelProperty.NONE)
      {return "";}
    if (type !== GeorelProperty.NEAR)
      {return type.valueOf();}
    let distance = options.newDistance;
    if (distance === undefined) {
      const lastEq: number = oldGeorel?.lastIndexOf("==")||-1;
      distance = lastEq > 0 ? parseFloat(oldGeorel?.substring(lastEq+2)?.trim()!) : 20_000;
    } 
    if (!(distance > 0))
      {distance = 20_000;}
    let distType: DistanceType|undefined = options.newDistanceType;
    if (distType === undefined) {
      const firstSem: number = oldGeorel?.indexOf(";")||-1;
      const eq: number = oldGeorel?.lastIndexOf("==")||-1;
      if (firstSem > 0 && eq > 0 && oldGeorel?.substring(firstSem+1, eq).trim().toLowerCase() === "mindistance")
        {distType = DistanceType.MIN_DISTANCE;}
      else
        {distType = DistanceType.MAX_DISTANCE;}
    }
    return "near;" + distType.valueOf() + "==" + distance;
  } 

  private georelChanged(georel: GeorelProperty|undefined) {
    if (!georel)
      {georel = GeorelProperty.NONE;}
    const vals = {...this.props, georel: GeoParamsEditor.buildGeorel(this.props.georel, {newType: georel}), onGeoChanged: undefined};
    this.props.onGeoChanged(vals as any);
  }

  private distanceTypeChanged(value: DistanceType|undefined) {
    if (!value)
      {value = DistanceType.MAX_DISTANCE;}
    const vals = {...this.props, georel: GeoParamsEditor.buildGeorel(this.props.georel, {newDistanceType: value}), onGeoChanged: undefined};
    this.props.onGeoChanged(vals as any);
  }

  private distanceChanged(value: number|undefined) {
    if (!(value! > 0))
      {value = 20_000;}
    const vals = {...this.props, georel: GeoParamsEditor.buildGeorel(this.props.georel, {newDistance: value}), onGeoChanged: undefined};
    this.props.onGeoChanged(vals as any);
  }

  // TODO some sort of client side validation
  private geometryChanged(value: string|undefined) {
    const vals = {...this.props, geometry: value, onGeoChanged: undefined};
    this.props.onGeoChanged(vals as any);
  }

  private geopropertyChanged(value: string|undefined) {
    const vals = {...this.props, geoproperty: value, onGeoChanged: undefined};
    this.props.onGeoChanged(vals as any);
  }

  private coordinatesChanged(coords: string|undefined) {
    const vals = {...this.props, coordinates: coords, onGeoChanged: undefined};
    this.props.onGeoChanged(vals as any);
  }

  render(): ReactNode { 
    const {georel, geometry, coordinates, geoproperty} = this.props;

    const georelType: GeorelProperty = georelFromValue(georel);
    const georelFilter = <React.Fragment>
        <h6>Geo filters</h6>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={12} tooltip="Specify the geo filter to apply (georel property)">
              Geo relation filter
            </InlineFormLabel>
            <Select<GeorelProperty>
              options={GeoParamsEditor.GEOREL_OPTIONS}
              value={georelType}
              onChange={val => this.georelChanged(val?.value)}
              width={20}
              ></Select>
          </div>
        </div>
      </React.Fragment> ;
    if (georelType === GeorelProperty.NONE)
      {return georelFilter;}
    let nearTypeFilters = <React.Fragment></React.Fragment>
    if (georelType === GeorelProperty.NEAR) {
      const isMinDistance: boolean = georel?.indexOf("min")! > 0;
      let distance: number = georel?.indexOf("==")! > 0 ? parseFloat(georel?.substring(georel?.lastIndexOf("==") + 2)!) : 20_000;
      if (!(distance > 0))
        {distance = 20_000}
      nearTypeFilters = <React.Fragment>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={12} tooltip="Distance in meters from specified center">
              Distance (m)
            </InlineFormLabel>
            {/* @ts-ignore */} 
            <Input 
              value={distance}
              onChange={evt => this.distanceChanged(parseFloat(evt.currentTarget?.value?.trim()))}
              type="number"
              width={12}
              title="Distance in meters"
            ></Input>
            <Select<DistanceType>
              options={GeoParamsEditor.DISTANCE_OPTIONS}
              value={isMinDistance ? DistanceType.MIN_DISTANCE : DistanceType.MAX_DISTANCE}
              onChange={val => this.distanceTypeChanged(val?.value)}
              width={20}
              ></Select>
          </div>
        </div>
      </React.Fragment>
    }
    
    return <React.Fragment>
      {georelFilter}
      {nearTypeFilters}
      <div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel width={12} tooltip="Specify the geo filter to apply (georel property)">
            Geo relation filter
          </InlineFormLabel>
          <Segment<string>
              value={geometry || "Point"}
              onChange={geo => this.geometryChanged(geo?.value)}
              options={GeoParamsEditor.GEOMETRY_OPTIONS}
              inputMinWidth={12}
              allowCustomValue
            ></Segment>
        </div>
      </div>
      <div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel width={12} tooltip="Specify coordinates ">
            Coordinates
          </InlineFormLabel>
          {/* @ts-ignore */} 
          <Input
              value={coordinates || ""}
              onChange={evt => this.coordinatesChanged(evt.currentTarget?.value?.trim())}
              width={12}
              placeholder="[8,40]"
              type="text"
            ></Input>
        </div>
      </div>
      <div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel width={12} tooltip="Specify the geo property (geoproperty)">
            Geo property
          </InlineFormLabel>
          <Segment<string>
              value={geoproperty||"location"}
              onChange={geo => this.geopropertyChanged(geo?.value)}
              options={GeoParamsEditor.GEOPROPERTY_OPTIONS}
              inputMinWidth={12}
              allowCustomValue
            ></Segment>
        </div>
      </div>
    </React.Fragment>

  }

}
