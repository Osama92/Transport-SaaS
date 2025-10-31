/**
 * Driver Expenses Screen
 * Track and submit expenses with receipt uploads
 */

import React, { useState, useEffect } from 'react';
import type { Driver, DriverExpense } from '../../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import AddExpenseModal from './AddExpenseModal';

interface DriverExpensesScreenProps {
  driver: Driver;
}

const DriverExpensesScreen: React.FC<DriverExpensesScreenProps> = ({ driver }) => {
  const [expenses, setExpenses] = useState<DriverExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'reimbursed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    reimbursedAmount: 0,
  });

  useEffect(() => {
    loadExpenses();
  }, [driver.id]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const expensesRef = collection(db, 'driverExpenses');
      const q = query(
        expensesRef,
        where('driverId', '==', driver.id),
        where('organizationId', '==', driver.organizationId),
        orderBy('expenseDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverExpense));

      setExpenses(expensesData);

      // Calculate statistics
      const total = expensesData.reduce((sum, exp) => sum + exp.amount, 0);
      const pending = expensesData.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
      const approved = expensesData.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
      const reimbursed = expensesData.filter(e => e.status === 'reimbursed').reduce((sum, e) => sum + e.amount, 0);

      setStats({
        totalExpenses: total,
        pendingAmount: pending,
        approvedAmount: approved,
        reimbursedAmount: reimbursed,
      });
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setShowAddModal(false);
    loadExpenses();
  };

  const filteredExpenses = filter === 'all' ? expenses : expenses.filter(e => e.status === filter);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'reimbursed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Fuel': return '⛽';
      case 'Tolls': return '🛣️';
      case 'Parking': return '🅿️';
      case 'Maintenance': return '🔧';
      case 'Meals': return '🍽️';
      case 'Accommodation': return '🏨';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">My Expenses</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Track and submit your expenses for reimbursement</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon="💰"
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses)}
          subtitle={`${expenses.length} expenses`}
        />
        <StatCard
          icon="⏳"
          title="Pending"
          value={formatCurrency(stats.pendingAmount)}
          subtitle={`${expenses.filter(e => e.status === 'pending').length} pending`}
        />
        <StatCard
          icon="✅"
          title="Approved"
          value={formatCurrency(stats.approvedAmount)}
          subtitle={`${expenses.filter(e => e.status === 'approved').length} approved`}
        />
        <StatCard
          icon="💸"
          title="Reimbursed"
          value={formatCurrency(stats.reimbursedAmount)}
          subtitle={`${expenses.filter(e => e.status === 'reimbursed').length} paid`}
        />
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected', 'reimbursed'] as const).map((status) => {
          const count = status === 'all' ? expenses.length : expenses.filter(e => e.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors capitalize ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg">No expenses found</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            {filter === 'all'
              ? 'Click "Add Expense" to submit your first expense'
              : `You have no ${filter} expenses`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-3 md:gap-4 flex-1">
                  <div className="text-3xl md:text-4xl">{getTypeIcon(expense.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate">{expense.description}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)} self-start`}>
                        {expense.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="block text-xs text-gray-500 dark:text-gray-500">Type</span>
                        <span className="font-medium">{expense.type}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 dark:text-gray-500">Date</span>
                        <span className="font-medium">
                          {new Date(expense.expenseDate).toLocaleDateString('en-NG')}
                        </span>
                      </div>
                      {expense.vendorName && (
                        <div>
                          <span className="block text-xs text-gray-500 dark:text-gray-500">Vendor</span>
                          <span className="font-medium">{expense.vendorName}</span>
                        </div>
                      )}
                      {expense.location && (
                        <div>
                          <span className="block text-xs text-gray-500 dark:text-gray-500">Location</span>
                          <span className="font-medium">{expense.location}</span>
                        </div>
                      )}
                    </div>
                    {expense.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <strong>Rejection Reason:</strong> {expense.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(expense.amount)}</p>
                  {expense.receiptPhotoUrl && (
                    <a
                      href={expense.receiptPhotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block"
                    >
                      View Receipt 📄
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          driver={driver}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddExpense}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  subtitle: string;
}> = ({ icon, title, value, subtitle }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-2 md:mb-3">
      <span className="text-xl md:text-2xl">{icon}</span>
    </div>
    <h3 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 md:mt-2">{title}</p>
  </div>
);

export default DriverExpensesScreen;
