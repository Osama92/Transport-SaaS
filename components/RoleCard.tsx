import React from 'react';

interface RoleCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    isSelected: boolean;
    onClick: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ icon, title, description, isSelected, onClick }) => {
    const baseClasses = "bg-white p-8 rounded-2xl text-left shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer border-2";
    const selectedClasses = "border-indigo-500 ring-2 ring-indigo-200";
    const notSelectedClasses = "border-gray-200";

    return (
        <div 
            className={`${baseClasses} ${isSelected ? selectedClasses : notSelectedClasses}`}
            onClick={onClick}
            role="button"
            aria-pressed={isSelected}
            tabIndex={0}
            onKeyPress={(e) => { if(e.key === 'Enter' || e.key === ' ') onClick() }}
        >
            <div className="mb-4">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500">{description}</p>
        </div>
    );
};

export default RoleCard;