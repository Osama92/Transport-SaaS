import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface CalendarPopoverProps {
    initialRange: { start: Date, end: Date };
    onApply: (range: { start: Date, end: Date }) => void;
    onClose: () => void;
}

const CalendarPopover: React.FC<CalendarPopoverProps> = ({ initialRange, onApply, onClose }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date(initialRange.end.getFullYear(), initialRange.end.getMonth(), 1));
    const [startDate, setStartDate] = useState<Date | null>(initialRange.start);
    const [endDate, setEndDate] = useState<Date | null>(initialRange.end);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(year, month, day);
        if (!startDate || (startDate && endDate)) {
            setStartDate(clickedDate);
            setEndDate(null);
        } else if (startDate && !endDate) {
            if (clickedDate < startDate) {
                setEndDate(startDate);
                setStartDate(clickedDate);
            } else {
                setEndDate(clickedDate);
            }
        }
    };

    const handleClear = () => {
        setStartDate(null);
        setEndDate(null);
    }
    
    const handleApply = () => {
        if (startDate && endDate) {
            onApply({ start: startDate, end: endDate });
        }
    }

    const getDayClass = (day: number) => {
        const date = new Date(year, month, day);
        let classes = "w-9 h-9 rounded-full flex items-center justify-center transition-colors text-sm ";

        if (!startDate) return classes + "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700";

        const isBetween = (d: Date, start: Date, end: Date) => d > start && d < end;
        const isStart = startDate && date.getTime() === startDate.getTime();
        const isEnd = endDate && date.getTime() === endDate.getTime();
        const isInRange = startDate && endDate && isBetween(date, startDate, endDate);
        const isHovering = startDate && !endDate && hoverDate && isBetween(date, startDate, hoverDate);
        const isHoverStart = startDate && !endDate && hoverDate && date.getTime() === hoverDate.getTime();
        
        if (isStart || isEnd) classes += "bg-indigo-500 text-white ";
        else if (isInRange || isHovering) classes += "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ";
        else classes += "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 ";
        
        if (isHoverStart) classes += "bg-indigo-500 text-white ";
        
        return classes;
    }

    return (
        <>
            {/* Mobile backdrop overlay */}
            <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={onClose}></div>

            {/* Calendar popover */}
            <div className="fixed sm:absolute top-1/2 left-1/2 sm:top-full sm:left-auto -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0 sm:right-0 sm:mt-3 w-[90vw] max-w-[320px] sm:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-700 z-50 p-4">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                    <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-md">
                    {monthNames[month]} {year}
                </h3>
                <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                    <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-sm">
                {daysOfWeek.map((day, index) => <div key={`day-${index}`} className="font-medium text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{day}</div>)}
                
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    return (
                        <div 
                            key={day} 
                            onMouseEnter={() => setHoverDate(new Date(year, month, day))}
                            onMouseLeave={() => setHoverDate(null)}
                        >
                            <button className={getDayClass(day)} onClick={() => handleDateClick(day)}>
                                {day}
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                <button onClick={handleClear} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Clear</button>
                <button onClick={handleApply} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg text-sm" disabled={!startDate || !endDate}>Apply</button>
            </div>
            </div>
        </>
    );
};

export default CalendarPopover;