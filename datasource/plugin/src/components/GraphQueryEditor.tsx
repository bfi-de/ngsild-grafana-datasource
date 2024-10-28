import { SelectableValue } from '@grafana/data';
import { ColorPicker, InlineFormLabel, Input, Segment, SegmentAsync } from '@grafana/ui';
import { QueryEditor } from 'QueryEditor';
import React, { PureComponent, ReactNode } from 'react';

// see https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/

interface NodeGraphProps {
  /**
   * For the time being the editor only supports the default primary and secondary attributes
   * 
   * Key "": default attributes
   * Other keys: entity types
   * Specific settings per type overwrite the default keys
   */
  primaryNodeAttributes?: Record<string, string[]>;
  secondaryNodeAttributes?: Record<string, string[]>;
  arcColorNodeAttributes?: Record<string, string[]>;
  arcColorComplementLabel?: string;
  primaryArcColor?: string;
  secondaryArcColor?: string;
  proposedAttributes?: Array<SelectableValue<string>>;
  attributesChanged(kind: "primary"|"secondary"|"arcColor", attributes: Record<string, string[]>|undefined): void;
  onColorChanged(primaryOrSecondary: boolean, color: string): void;
  onArcColorComplementChanged(label?: string): void;
}

// a stateless subcomponent
export class GraphQueryEditor extends PureComponent<NodeGraphProps, Readonly<{}>> {


  private attributeChanged(kind: "primary"|"secondary"|"arcColor", newValue?: string, oldValue?: any) {
    newValue = newValue?.trim() || "";
    oldValue = oldValue || "";
    if (newValue === oldValue)
      {return;}
    let records = (this.props as any)[kind + "NodeAttributes"];
    if (!records)
      {records = {};}
    else
      {records = {...records};}
    const attributes: any[] = "" in records ? records[""] : [];
    const idx: number = attributes.indexOf(oldValue);
    if (idx < 0) {  
      if (!newValue) 
        {return;}
      attributes.push(newValue);
    } else {
      if (newValue) {
        attributes.splice(idx, 1, newValue); // TODO convert value to numeric format?
      } else {
        attributes.splice(idx, 1);
      }
    }
    records[""] = [...new Set(attributes)];
    this.props.attributesChanged(kind, records); // propogate to parent component
  }

  private selector(
    kind: "primary"|"secondary"|"arcColor",
    proposedValues?: Array<SelectableValue<string>>,
    value?: string,
  ): ReactNode {
    
    return (
      <Segment<string>
        value={QueryEditor.toOption(value || "")}
        onChange={val => this.attributeChanged(kind, val.value, value)}
        options={proposedValues || []}
        inputMinWidth={6}
        allowCustomValue
      ></Segment>
    );
    // options={proposedValues?.map(val => QueryEditor.toOption(val)) || []}
  }

  render(): ReactNode {
    const {primaryNodeAttributes, secondaryNodeAttributes, arcColorNodeAttributes, primaryArcColor, secondaryArcColor, arcColorComplementLabel, proposedAttributes } = this.props;
    const primaries: string[] = (primaryNodeAttributes && "" in primaryNodeAttributes ? primaryNodeAttributes[""] : []).map(attr => attr.trim()).filter(attr => attr);
    const secondaries: string[] = (secondaryNodeAttributes && "" in secondaryNodeAttributes ? secondaryNodeAttributes[""] : []).map(attr => attr.trim()).filter(attr => attr);
    const arcColors: string[] = (arcColorNodeAttributes && "" in arcColorNodeAttributes ? arcColorNodeAttributes[""] : []).map(attr => attr.trim()).filter(attr => attr);
    const primaryElements: ReactNode[] = primaries.map(attribute => this.selector("primary", proposedAttributes, attribute))
    primaryElements.push(this.selector("primary", proposedAttributes));
    const secondaryElements: ReactNode[] = secondaries.map(attribute => this.selector("secondary", proposedAttributes, attribute))
    secondaryElements.push(this.selector("secondary", proposedAttributes));
    const arcColorElements: ReactNode[] = arcColors.map(attribute => this.selector("arcColor", proposedAttributes, attribute))
    arcColorElements.push(this.selector("arcColor", proposedAttributes));
    const primaryArcColor1 = primaryArcColor||"green";
    const secondaryArcColor1 = secondaryArcColor||"red";
    
    const result = 
      <React.Fragment>
        <h6>Graph settings</h6>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={12} tooltip="Primary attributes for node values">
              Primary node properties
            </InlineFormLabel>
            {primaryElements}
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={12} tooltip="Secondary attributes for node values; shown in a smaller font size below the primary values">
              Secondary node properties
            </InlineFormLabel>
            {secondaryElements}
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={12} tooltip="Attribute for coloring of node circles; must take values between 0 and 1.">
              Arc color properties
            </InlineFormLabel>
            {arcColorElements}
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={12} tooltip="Label for the complement of the selected arc color property">
              Arc color complement
            </InlineFormLabel>
            {/* @ts-ignore */} 
            <Input
              value={arcColorComplementLabel}
              onChange={evt => this.props.onArcColorComplementChanged(evt.currentTarget.value?.trim() || "")}
            ></Input>
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={12} tooltip="Primary arc color. Only relevant if a property for the arc color is selected.">
              Primary arc color
            </InlineFormLabel>
            &nbsp;
            <ColorPicker
              color={primaryArcColor1}
              onChange={color => this.props.onColorChanged(true, color)}
            ></ColorPicker>
            &nbsp; &nbsp; &nbsp;
            <InlineFormLabel width={12} tooltip="Secondary arc color. Only relevant if a property for the arc color is selected.">
              Secondary arc color
            </InlineFormLabel>
            &nbsp;
            <ColorPicker
              color={secondaryArcColor1}
              onChange={color => this.props.onColorChanged(false, color)}
            ></ColorPicker>
          </div>
        </div>
      </React.Fragment>;
    return result;
  }

}
