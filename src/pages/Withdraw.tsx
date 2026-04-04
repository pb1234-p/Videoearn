import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { UserProfile, WithdrawalRequest } from '../types';
import Layout from '../components/Layout';
import { Wallet, Send, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { CURRENCY_SYMBOL, MIN_WITHDRAWAL_AMOUNT } from '../constants';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import WithdrawalStatus from '../components/WithdrawalStatus';

export default function Withdraw() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setProfile(data);
        if (data.upiId) setUpiId(data.upiId);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));

    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribeWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      setRecentWithdrawals(list);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals'));

    return () => {
      unsubscribeProfile();
      unsubscribeWithdrawals();
    };
  }, [user]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL_AMOUNT) {
      setError(`Minimum withdrawal amount is ${CURRENCY_SYMBOL}${MIN_WITHDRAWAL_AMOUNT}`);
      return;
    }

    if (withdrawAmount > profile.balance) {
      setError('Insufficient balance');
      return;
    }

    if (!upiId.includes('@')) {
      setError('Invalid UPI ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date().toISOString();
      const request: Omit<WithdrawalRequest, 'id'> = {
        userId: user.uid,
        userEmail: user.email || '',
        amount: withdrawAmount,
        upiId: upiId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, 'withdrawals'), request);
      setSuccess('Withdrawal request submitted successfully! It will be processed within 24-48 hours.');
      setAmount('');
    } catch (err) {
      setError('Failed to submit withdrawal request');
      handleFirestoreError(err, OperationType.CREATE, 'withdrawals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Withdrawal Form */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Withdraw Money</h1>
            </div>

            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-semibold">Important Information:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Minimum withdrawal: {CURRENCY_SYMBOL}{MIN_WITHDRAWAL_AMOUNT}</li>
                  <li>Processing time: 24-48 hours</li>
                  <li>Ensure your UPI ID is correct</li>
                </ul>
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Balance</label>
                <div className="text-3xl font-bold text-gray-900">{CURRENCY_SYMBOL}{profile?.balance.toFixed(2)}</div>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">Withdraw Amount ({CURRENCY_SYMBOL})</label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min ${MIN_WITHDRAWAL_AMOUNT}`}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-2">UPI ID (e.g., user@upi)</label>
                <input
                  type="text"
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-xl flex items-center gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Withdrawals */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Requests</h2>
          {recentWithdrawals.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              No recent withdrawal requests.
            </div>
          ) : (
            <div className="space-y-4">
              {recentWithdrawals.map((req) => (
                <div key={req.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{CURRENCY_SYMBOL}{req.amount}</p>
                    <p className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                  <WithdrawalStatus status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
