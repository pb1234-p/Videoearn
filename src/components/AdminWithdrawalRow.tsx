import { Check, X, Loader2 } from 'lucide-react';
import { WithdrawalRequest } from '../types';
import { CURRENCY_SYMBOL } from '../constants';
import WithdrawalStatus from './WithdrawalStatus';
import { useState } from 'react';

interface AdminWithdrawalRowProps {
  key?: string;
  request: WithdrawalRequest;
  onApprove: (req: WithdrawalRequest) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export default function AdminWithdrawalRow({ request, onApprove, onReject }: AdminWithdrawalRowProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      if (action === 'approve') {
        await onApprove(request);
      } else {
        await onReject(request.id);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <p className="font-semibold text-gray-900">{request.userEmail}</p>
        <p className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleString()}</p>
      </td>
      <td className="px-6 py-4 font-bold text-gray-900">{CURRENCY_SYMBOL}{request.amount}</td>
      <td className="px-6 py-4 text-sm text-gray-600">{request.upiId}</td>
      <td className="px-6 py-4">
        <WithdrawalStatus status={request.status} />
      </td>
      <td className="px-6 py-4 text-right">
        {request.status === 'pending' && (
          <div className="flex items-center justify-end gap-2">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <>
                <button
                  onClick={() => handleAction('approve')}
                  className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                  title="Approve"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                  title="Reject"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
