import React from 'react';
import { DateRange, DateRangePreset } from '../../types';
import { getDateRangeFromPreset } from '../../lib/utils';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, className = '' }) => {
  const presets: { id: DateRangePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days', label: 'Last 7 Days' },
    { id: '30days', label: 'Last 30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_year', label: 'This Year' }
  ];

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = getDateRangeFromPreset(preset);
    onChange(range);
  };

  const handleCustomStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = new Date(e.target.value).toISOString();
    onChange({
      preset: 'custom',
      startDate: start,
      endDate: value.endDate
    });
  };

  const handleCustomEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const end = new Date(e.target.value + 'T23:59:59.999Z').toISOString();
    onChange({
      preset: 'custom',
      startDate: value.startDate,
      endDate: end
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="relative inline-flex items-center">
        <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
        <select
          value={value.preset}
          onChange={(e) => handlePresetSelect(e.target.value as DateRangePreset)}
          className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-medium rounded-lg pl-9 pr-8 py-2 hover:border-zinc-700 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
              {p.label}
            </option>
          ))}
          <option value="custom" className="bg-zinc-900 text-white">
            Custom Range
          </option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
      </div>

      {value.preset === 'custom' && (
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
          <input
            type="date"
            value={value.startDate ? value.startDate.slice(0, 10) : ''}
            onChange={handleCustomStart}
            className="bg-transparent text-zinc-200 focus:outline-none text-xs"
          />
          <span>to</span>
          <input
            type="date"
            value={value.endDate ? value.endDate.slice(0, 10) : ''}
            onChange={handleCustomEnd}
            className="bg-transparent text-zinc-200 focus:outline-none text-xs"
          />
        </div>
      )}
    </div>
  );
};
