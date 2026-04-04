import { User } from 'lucide-react';
import { cn } from '../lib/utils';

interface UserAvatarProps {
  displayName?: string;
  className?: string;
}

export default function UserAvatar({ displayName, className }: UserAvatarProps) {
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <div className={cn("w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold", className)}>
      {initials || <User className="w-5 h-5" />}
    </div>
  );
}
