import { SelectableValue } from "@grafana/data";
import { InlineFormLabel, Input, MultiSelect, Segment } from "@grafana/ui";
import { AggregationPeriod, AggregationPeriodBuilder } from "AggregationHelper";
import React, { PureComponent, ReactNode } from 'react';
import { aggregationMethodForValue, TimeseriesAggregationMethod } from "types";

interface TsAggregationProps {

    aggrMethod?: string;
    aggrPeriodDuration?: string;
    onAggregationMethodChanged(aggrMethod: TimeseriesAggregationMethod[]): void;
    onAggregationPeriodChanged(aggrPeriodDuration: AggregationPeriod): void;
}
  

// a stateless subcomponent
export class TsAggregationEditor extends PureComponent<TsAggregationProps, Readonly<{}>> {

    private static readonly AGGREGATION_METHODS: Array<SelectableValue<TimeseriesAggregationMethod>> = [
        {value: TimeseriesAggregationMethod.TOTAL_COUNT, label: "Total count", description: "Number of points", title: "Number of points"},
        {value: TimeseriesAggregationMethod.DISTINCT_COUNT, label: "Distinct count", description: "Number of distinct values", title: "Number of distinct values"},
        {value: TimeseriesAggregationMethod.SUM, label: "Sum", description: "", title: ""},
        {value: TimeseriesAggregationMethod.AVERAGE, label: "Average", description: "", title: ""},
        {value: TimeseriesAggregationMethod.MIN, label: "Min", description: "", title: ""},
        {value: TimeseriesAggregationMethod.MAX, label: "Max", description: "", title: ""},
        {value: TimeseriesAggregationMethod.STANDARD_DEVIATION, label: "Standard deviation", description: "", title: ""},
        {value: TimeseriesAggregationMethod.SUM_SQUARE, label: "Sum square", description: "Sum of squared valued", title: "Sum of squared valued"},
    ];

    private methodsChanged(aggrMethod: Array<SelectableValue<TimeseriesAggregationMethod>>) {
        this.props.onAggregationMethodChanged(aggrMethod.map(val => val.value).filter(m => m) as TimeseriesAggregationMethod[]);
    }

    private periodChanged(builder: AggregationPeriodBuilder, method: (s: number) => AggregationPeriodBuilder, value?: string) {
        const number = parseInt(value||"", 10);
        if (isFinite(number)) {
            builder = method.bind(builder)(number);
            this.props.onAggregationPeriodChanged(builder.build());
        }
    }

    render(): ReactNode { 
        const {aggrMethod, aggrPeriodDuration} = this.props;
        const aggrMethod1: TimeseriesAggregationMethod[] = (aggrMethod || "").split(",").map(m => m.trim()).map(aggregationMethodForValue).filter(m => m) as TimeseriesAggregationMethod[];
        const period: AggregationPeriod = AggregationPeriod.deserialize(aggrPeriodDuration) || AggregationPeriod.builder().build();
        const builder = AggregationPeriod.builder(period);
        const elements = [
          <div className="gf-form-inline" key="aggrmethod">
            <div className="gf-form">
                <InlineFormLabel width={12} tooltip="Temporal aggregation of values. Deselect all to retrieve the original timeseries.">
                    Aggregation method
                </InlineFormLabel>
                <MultiSelect<TimeseriesAggregationMethod>
                    options={TsAggregationEditor.AGGREGATION_METHODS}
                    value={aggrMethod1}
                    onChange={this.methodsChanged.bind(this)}
                    width={20}
                ></MultiSelect>
            </div>
          </div>
        ];
        if (aggrMethod1.length > 0) {
            elements.push(
                <div className="gf-form-inline" key="aggrperiod">
                    <div className="gf-form">
                        <InlineFormLabel width={12} tooltip="Temporal aggregation duration. Set all entries to 0 to aggregate over the whole time interval.">
                            Aggregation period
                        </InlineFormLabel>
                        <Input
                            value={period.years()}
                            onChange={val => this.periodChanged(builder, builder.setYears, val?.currentTarget?.value?.trim())}
                            type="number"
                            width={5}
                            title="Years"
                        ></Input>
                        <InlineFormLabel width={2}>
                            Y
                        </InlineFormLabel>
                        <Input
                            value={period.months()}
                            onChange={val => this.periodChanged(builder, builder.setMonths, val?.currentTarget?.value?.trim())}
                            type="number"
                            width={5}
                            title="Months"
                        ></Input>
                        <InlineFormLabel width={2}>
                            M
                        </InlineFormLabel>
                        <Input
                            value={period.days()}
                            onChange={val => this.periodChanged(builder, builder.setDays, val?.currentTarget?.value?.trim())}
                            type="number"
                            width={5}
                            title="Days"
                        ></Input>
                        <InlineFormLabel width={2}>
                            DT
                        </InlineFormLabel>
                        <Input
                            value={period.hours()}
                            onChange={val => this.periodChanged(builder, builder.setHours, val?.currentTarget?.value?.trim())}
                            type="number"
                            width={5}
                            title="Hours"
                        ></Input>
                        <InlineFormLabel  width={2}>
                            H
                        </InlineFormLabel>
                        <Input
                            value={period.minutes()}
                            onChange={val => this.periodChanged(builder, builder.setMinutes, val?.currentTarget?.value?.trim())}
                            type="number"
                            width={5}
                            title="Minutes"
                        ></Input>
                        <InlineFormLabel width={2}>
                            M
                        </InlineFormLabel>
                        <Input
                            value={period.seconds()}
                            onChange={val => this.periodChanged(builder, builder.setSeconds, val?.currentTarget?.value?.trim())}
                            type="number"
                            width={5}
                            title="Seconds"
                        ></Input>
                        <InlineFormLabel width={2}>
                            S
                        </InlineFormLabel>
                    </div>
                </div>
            );
        }
        const frag = <React.Fragment>
            <h6>Temporal aggregation</h6>
            {elements}
        </React.Fragment>
        return frag;
    }


}
