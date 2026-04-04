import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface WithdrawalStatusProps {
  status: 'pending' | 'approved' | 'rejected';
  className?: string;
}

export default function WithdrawalStatus({ status, className }: WithdrawalStatusProps) {
  const config = {
    pending: {
      icon: Clock,
      text: 'Pending',
      bg: 'bg-yellow-100',
      textCol: 'text-yellow-700',
    },
    approved: {
      icon: CheckCircle,
      text: 'Approved',
      bg: 'bg-green-100',
      textCol: 'text-green-700',
    },
    rejected: {
      icon: XCircle,
      text: 'Rejected',
      bg: 'bg-red-100',
      textCol: 'text-red-700',
    },
  };

  const { icon: Icon, text, bg, textCol } = config[status];

  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", bg, textCol, className)}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </div>
  );
}
