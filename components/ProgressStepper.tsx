import React from 'react';

interface ProgressStepperProps {
    currentStep: number;
    totalSteps: number;
}

const steps = ['Role', 'Subscription', 'Dashboard'];

const ProgressStepper: React.FC<ProgressStepperProps> = ({ currentStep, totalSteps }) => {
    return (
        <div className="w-full max-w-md mx-auto">
            <div className="flex items-center">
                {Array.from({ length: totalSteps }, (_, i) => {
                    const stepNumber = i + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isActive = stepNumber === currentStep;
                    
                    return (
                        <React.Fragment key={stepNumber}>
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                                    isActive ? 'bg-indigo-500 text-white' : isCompleted ? 'bg-indigo-200 text-indigo-600' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {isCompleted ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    ) : (
                                        stepNumber
                                    )}
                                </div>
                                <p className={`mt-2 text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>{steps[i]}</p>
                            </div>
                            {stepNumber < totalSteps && (
                                <div className={`flex-1 h-1 mx-4 transition-colors ${isCompleted || isActive ? 'bg-indigo-400' : 'bg-gray-200'}`}></div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressStepper;
