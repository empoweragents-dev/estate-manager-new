import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateFilterProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateFilter({
  date,
  onDateChange,
  placeholder = "Select date",
  className,
}: DateFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
          {date && (
            <X
              className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDateChange(undefined);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangeFilterProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  className?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn("flex gap-2 items-center", className)}>
      <DateFilter
        date={startDate}
        onDateChange={onStartDateChange}
        placeholder="From date"
        className="flex-1"
      />
      <span className="text-muted-foreground text-sm">to</span>
      <DateFilter
        date={endDate}
        onDateChange={onEndDateChange}
        placeholder="To date"
        className="flex-1"
      />
    </div>
  );
}

interface MonthYearFilterProps {
  month: string;
  year: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  availableYears?: number[];
  showAllOption?: boolean;
  className?: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function MonthYearFilter({
  month,
  year,
  onMonthChange,
  onYearChange,
  availableYears,
  showAllOption = true,
  className,
}: MonthYearFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = availableYears || Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select Month" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">All Months</SelectItem>}
          {monthNames.map((name, index) => (
            <SelectItem key={index} value={(index + 1).toString()}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select Year" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">All Years</SelectItem>}
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface CombinedFilterProps {
  filterType: "month" | "date" | "range";
  onFilterTypeChange: (type: "month" | "date" | "range") => void;
  month: string;
  year: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  specificDate?: Date;
  onSpecificDateChange: (date: Date | undefined) => void;
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  availableYears?: number[];
  className?: string;
}

export function CombinedDateFilter({
  filterType,
  onFilterTypeChange,
  month,
  year,
  onMonthChange,
  onYearChange,
  specificDate,
  onSpecificDateChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  availableYears,
  className,
}: CombinedFilterProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={(v) => onFilterTypeChange(v as "month" | "date" | "range")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">By Month</SelectItem>
            <SelectItem value="date">Specific Date</SelectItem>
            <SelectItem value="range">Date Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filterType === "month" && (
        <MonthYearFilter
          month={month}
          year={year}
          onMonthChange={onMonthChange}
          onYearChange={onYearChange}
          availableYears={availableYears}
        />
      )}

      {filterType === "date" && (
        <DateFilter
          date={specificDate}
          onDateChange={onSpecificDateChange}
          placeholder="Select a specific date"
        />
      )}

      {filterType === "range" && (
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
        />
      )}
    </div>
  );
}
