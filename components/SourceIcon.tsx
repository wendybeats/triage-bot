import { Mail, MessageSquare, Figma, FileText, Mic } from 'lucide-react';
import { SourceType } from '@/types';

const iconMap: Record<SourceType, React.ComponentType<{ className?: string }>> = {
  gmail: Mail,
  slack: MessageSquare,
  figma: Figma,
  notion: FileText,
  voice: Mic,
};

const colorMap: Record<SourceType, string> = {
  gmail: 'text-red-400',
  slack: 'text-purple-400',
  figma: 'text-pink-400',
  notion: 'text-gray-300',
  voice: 'text-primary-400',
};

export function SourceIcon({ source, className }: { source: SourceType; className?: string }) {
  const Icon = iconMap[source];
  return <Icon className={`${colorMap[source]} ${className || 'h-4 w-4'}`} />;
}
