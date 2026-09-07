import { useEffect, useMemo, useState } from "react";
import {
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type KpiDatePreset =
  | "last_month"
  | "this_month"
  | "last_6_months"
  | "this_year"
  | "last_year"
  | "custom"
  | "all_time";

export type KpiDateRangeValue = {
  startDate: string;
  endDate: string;
};

type Props = {
  value: KpiDateRangeValue;
  onChange: (next: KpiDateRangeValue) => void;
  className?: string;
};

const toIso = (date: Date) => format(date, "yyyy-MM-dd");

const rangeLabel = (value: KpiDateRangeValue) => {
  if (!value.startDate && !value.endDate) return "All time";
  if (value.startDate && value.endDate) {
    return `${format(new Date(value.startDate), "MMM d, yyyy")} - ${format(new Date(value.endDate), "MMM d, yyyy")}`;
  }
  return value.startDate || value.endDate;
};

const PRESET_LABELS: Record<KpiDatePreset, string> = {
  last_month: "Last Month",
  this_month: "This Month",
  last_6_months: "Last 6 Months",
  this_year: "This Year",
  last_year: "Last Year",
  custom: "Custom",
  all_time: "All Time",
};

const getPresetRange = (preset: Exclude<KpiDatePreset, "custom">): KpiDateRangeValue => {
  const now = new Date();

  if (preset === "all_time") {
    return { startDate: "", endDate: "" };
  }

  if (preset === "this_month") {
    return {
      startDate: toIso(startOfMonth(now)),
      endDate: toIso(now),
    };
  }

  if (preset === "last_month") {
    const previousMonth = subMonths(now, 1);
    return {
      startDate: toIso(startOfMonth(previousMonth)),
      endDate: toIso(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)),
    };
  }

  if (preset === "last_6_months") {
    return {
      startDate: toIso(startOfMonth(subMonths(now, 5))),
      endDate: toIso(now),
    };
  }

  if (preset === "this_year") {
    return {
      startDate: toIso(startOfYear(now)),
      endDate: toIso(now),
    };
  }

  return {
    startDate: toIso(startOfYear(subYears(now, 1))),
    endDate: toIso(endOfYear(subYears(now, 1))),
  };
};

const isSameRange = (a: KpiDateRangeValue, b: KpiDateRangeValue) =>
  a.startDate === b.startDate && a.endDate === b.endDate;

const inferPresetFromValue = (value: KpiDateRangeValue): KpiDatePreset => {
  if (!value.startDate && !value.endDate) return "all_time";

  const knownPresets: Array<Exclude<KpiDatePreset, "custom">> = [
    "last_month",
    "this_month",
    "last_6_months",
    "this_year",
    "last_year",
    "all_time",
  ];

  for (const preset of knownPresets) {
    if (isSameRange(value, getPresetRange(preset))) {
      return preset;
    }
  }

  return "custom";
};

export function KpiDateRangeFilter({ value, onChange, className }: Props) {
  const [preset, setPreset] = useState<KpiDatePreset>(() => inferPresetFromValue(value));
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setPreset(inferPresetFromValue(value));
  }, [value.startDate, value.endDate]);

  const calendarValue = useMemo<DateRange | undefined>(() => {
    if (!value.startDate && !value.endDate) return undefined;
    return {
      from: value.startDate ? new Date(value.startDate) : undefined,
      to: value.endDate ? new Date(value.endDate) : undefined,
    };
  }, [value.endDate, value.startDate]);

  const onPresetChange = (next: KpiDatePreset) => {
    setPreset(next);
    if (next === "custom") {
      return;
    }

    onChange(getPresetRange(next));
  };

  const selectDisplayLabel =
    preset === "custom"
      ? value.startDate && value.endDate
        ? `Custom: ${rangeLabel(value)}`
        : "Custom: Pick date range"
      : PRESET_LABELS[preset];

  return (
    <div className={cn("relative", className)}>
      <div className="w-full md:w-72" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <Select value={preset} onValueChange={(v) => onPresetChange(v as KpiDatePreset)}>
            <SelectTrigger>
              <SelectValue placeholder="Select period">{selectDisplayLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>

          {preset === "custom" && isHovering && (
            <div className="absolute z-50 mt-2 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{rangeLabel(value)}</span>
              </div>
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={calendarValue?.from}
              selected={calendarValue}
              onSelect={(next) => {
                onChange({
                  startDate: next?.from ? toIso(next.from) : "",
                  endDate: next?.to ? toIso(next.to) : "",
                });
              }}
            />
            </div>
          )}
      </div>
    </div>
  );
}
