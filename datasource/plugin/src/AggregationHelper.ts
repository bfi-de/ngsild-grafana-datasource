
export interface AggregationPeriodBuilder {

    build(): AggregationPeriod;

    setSeconds(s: number): this;
    setMinutes(s: number): this;
    setHours(s: number): this;
    setDays(s: number): this;
    setMonths(s: number): this;
    setYears(s: number): this;

}

class AggregationPeriodBuilderImpl implements AggregationPeriodBuilder {

    private _seconds = 0;
    private _minutes = 0;
    private _hours = 0;
    private _days = 0;
    private _months = 0;
    private _years = 0;

    private static _validate(s: number): number {
        if (!isFinite(s))
            {throw new Error("Invalid number " + s);}
        // TODO validate if integer?
        return s;
    }

    // @ts-ignore
    constructor(private readonly _build: (s, m, h, d, mn, y) => AggregationPeriod) {}

    setSeconds(s: number): this {
        this._seconds = AggregationPeriodBuilderImpl._validate(s);
        return this;
    }

    setMinutes(s: number): this {
        this._minutes = AggregationPeriodBuilderImpl._validate(s);
        return this;
    }

    setHours(s: number): this {
        this._hours = AggregationPeriodBuilderImpl._validate(s);
        return this;
    }

    setDays(s: number): this {
        this._days = AggregationPeriodBuilderImpl._validate(s);
        return this;
    }

    setMonths(s: number): this {
        this._months = AggregationPeriodBuilderImpl._validate(s);
        return this;
    }

    setYears(s: number): this {
        this._years = AggregationPeriodBuilderImpl._validate(s);
        return this;
    }

    build(): AggregationPeriod {
        return this._build(this._seconds, this._minutes, this._hours, this._days, this._months, this._years);
    }

}

export class AggregationPeriod {

    private readonly _isEmpty: boolean;
    private readonly _isTimePartEmpty: boolean;

    private constructor(
        private _seconds: number,
        private _minutes: number,
        private _hours: number,
        private _days: number,
        private _months: number,
        private _years: number
    ) {
        this._isTimePartEmpty = [_seconds, _minutes, _hours].findIndex(n => n !== 0) < 0;
        this._isEmpty = this._isTimePartEmpty  && [_days, _months, _years].findIndex(n => n !== 0) < 0;
    }

    static builder(other?: AggregationPeriod): AggregationPeriodBuilder {
        // @ts-ignore
        const builder = new AggregationPeriodBuilderImpl((s, m, h, d, mn, y) => new AggregationPeriod(s, m, h, d, mn, y));
        if (other) {
            builder.setSeconds(other._seconds);
            builder.setMinutes(other._minutes);
            builder.setHours(other._hours);
            builder.setDays(other._days);
            builder.setMonths(other._months);
            builder.setYears(other._years);
        }
        return builder;
    }

    static deserialize(str?: string): AggregationPeriod|undefined {
        if (!str)
            {return undefined;}
        try {
            str = str.toUpperCase();
            if (!str.startsWith("P"))
                {return undefined;}
            const hasSeparator: boolean = str.indexOf("T") > 0;
            const builder: AggregationPeriodBuilder = AggregationPeriod.builder();
            let startIdx = 0;
            const yr: number = str.indexOf("Y", startIdx);
            if (yr > startIdx) {
                builder.setYears(parseInt(str.substring(startIdx+1, yr), 10));
                startIdx = yr;
            }
            const months = str.indexOf("M", startIdx);
            if (months > startIdx && (!hasSeparator || months < str.indexOf("T", startIdx))) {
                builder.setMonths(parseInt(str.substring(startIdx+1, months), 10));
                startIdx = months;
            }
            const days = str.indexOf("D", startIdx);
            if (days > startIdx) {
                builder.setDays(parseInt(str.substring(startIdx+1, days), 10));
                startIdx = days;
            }
            if (hasSeparator)
                {startIdx += 1;}
            const hours = str.indexOf("H", startIdx);
            if (hours > startIdx) {
                builder.setHours(parseInt(str.substring(startIdx+1, hours), 10));
                startIdx = hours;
            }
            const minutes = str.indexOf("M", startIdx);
            if (minutes > startIdx && hasSeparator && minutes > str.indexOf("T", startIdx)) {
                builder.setMinutes(parseInt(str.substring(startIdx+1, minutes), 10));
                startIdx = minutes;
            }
            const seconds = str.indexOf("S", startIdx);
            if (seconds > startIdx) {
                builder.setSeconds(parseInt(str.substring(startIdx+1, seconds), 10));
                startIdx = seconds;
            }
            return builder.build();
        } catch (e) {
            console.log("Invalid aggregation period", str);
            return undefined;
        }
    }

    // P[n]Y[n]M[n]DT[n]H[n]M[n]S or P[n]W
    serialize(): string {
        if (this._isEmpty)
            {return "PT0S";}
        let str = "P";
        const attach = (arg: [number, string]): void => {
            if (arg[0] !== 0)
                {str += arg[0] + arg[1];}
        };
        ([([this._years, "Y"]), ([this._months, "M"]), ([this._days, "D"])] as Array<[number, string]>).forEach(attach);
        if (!this._isTimePartEmpty)
            {str += "T";}
        ([([this._hours, "H"]), ([this._minutes, "M"]), ([this._seconds, "S"])] as Array<[number, string]>).forEach(attach);
        return str;
    }

    seconds(): number {
        return this._seconds;
    }

    minutes(): number {
        return this._minutes;
    }

    hours(): number {
        return this._hours;
    }

    days(): number {
        return this._days;
    }

    months(): number {
        return this._months;
    }

    years(): number {
        return this._years;
    }

}
