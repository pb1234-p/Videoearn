import { LucideIcon, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
}

export default function EmptyState({ icon: Icon = AlertCircle, title, description }: EmptyStateProps) {
  return (
    <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-500 mt-2">{description}</p>
    </div>
  );
}
