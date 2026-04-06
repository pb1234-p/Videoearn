import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { WithdrawalRequest } from '../types';
import Layout from '../components/Layout';
import { History as HistoryIcon, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Circle as XCircle, Clock } from 'lucide-react';
import { CURRENCY_SYMBOL } from '../constants';

import EmptyState from '../components/EmptyState';
import WithdrawalStatus from '../components/WithdrawalStatus';

export default function History() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWithdrawals = async () => {
      const { data } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (data) {
        setWithdrawals(data as WithdrawalRequest[]);
        setLoading(false);
      }
    };

    fetchWithdrawals();

    // Subscribe to withdrawals changes
    const withdrawalsChannel = supabase
      .channel('history-withdrawals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `userId=eq.${user.id}`,
        },
        () => {
          fetchWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(withdrawalsChannel);
    };
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <HistoryIcon className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
        </div>

        {withdrawals.length === 0 ? (
          <EmptyState 
            icon={HistoryIcon}
            title="No payment history" 
            description="Your withdrawal requests will appear here once you make them." 
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">UPI ID</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawals.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {new Date(req.createdAt).toLocaleDateString()}
                        <p className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{CURRENCY_SYMBOL}{req.amount}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.upiId}</td>
                      <td className="px-6 py-4">
                        <WithdrawalStatus status={req.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(req.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
