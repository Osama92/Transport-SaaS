import React, { useState } from 'react';
import { migrateDriversAddWalletBalance } from '../services/firestore/drivers';

interface MigrationButtonProps {
    organizationId: string;
}

/**
 * Temporary migration button to add walletBalance to existing drivers
 * This component can be removed after migration is complete
 */
const MigrationButton: React.FC<MigrationButtonProps> = ({ organizationId }) => {
    const [migrating, setMigrating] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleMigration = async () => {
        if (!confirm('This will add walletBalance: 0 to all drivers in your organization that don\'t have it. Continue?')) {
            return;
        }

        setMigrating(true);
        setResult(null);

        try {
            await migrateDriversAddWalletBalance(organizationId);
            setResult('✅ Migration successful! Check console for details.');
        } catch (error: any) {
            setResult(`❌ Migration failed: ${error.message}`);
        } finally {
            setMigrating(false);
        }
    };

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-yellow-800 mb-1">
                        Database Migration Required
                    </h3>
                    <p className="text-sm text-yellow-700 mb-3">
                        Existing drivers need a <code className="bg-yellow-100 px-1 py-0.5 rounded">walletBalance</code> field. Click below to migrate.
                    </p>
                    <button
                        onClick={handleMigration}
                        disabled={migrating}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold text-sm rounded-lg transition-colors"
                    >
                        {migrating ? 'Migrating...' : 'Run Migration'}
                    </button>
                    {result && (
                        <p className="mt-3 text-sm font-semibold">{result}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MigrationButton;
