import React, { useState } from 'react';

// Star Icon Component
const StarIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor"
        className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'} ${className}`}
    >
        <path fillRule="evenodd" d="M10.868 2.884c.321-.662 1.215-.662 1.536 0l1.83 3.745 4.13.601c.73.106 1.02.998.494 1.508l-2.988 2.91.705 4.114c.124.727-.638 1.283-1.29.953l-3.693-1.94-3.693 1.94c-.652.33-1.414-.226-1.29-.953l.705-4.114-2.988-2.91c-.525-.51-.235-1.402.494-1.508l4.13-.601 1.83-3.745z" clipRule="evenodd" />
    </svg>
);

interface StarRatingProps {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readOnly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, readOnly = false }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const handleMouseOver = (index: number) => {
        if (!readOnly) {
            setHoverRating(index);
        }
    };

    const handleMouseLeave = () => {
        if (!readOnly) {
            setHoverRating(0);
        }
    };

    const handleClick = (index: number) => {
        if (!readOnly && onRatingChange) {
            onRatingChange(index);
        }
    };

    return (
        <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((index) => (
                <button
                    type="button"
                    key={index}
                    className={readOnly ? 'cursor-default' : 'cursor-pointer'}
                    onMouseOver={() => handleMouseOver(index)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(index)}
                    disabled={readOnly}
                    aria-label={`Rate ${index} stars`}
                >
                    <StarIcon filled={(hoverRating || rating) >= index} />
                </button>
            ))}
        </div>
    );
};

export default StarRating;
