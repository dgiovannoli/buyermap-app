import {
  Users,
  Building,
  AlertCircle,
  Trophy,
  Zap,
  Shield,
  MessageSquare,
} from 'lucide-react';

type AttrStyles = {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  bgClass: string;
  iconClass: string;
  titleClass: string;
};

export function getAttributeIconAndColors(attribute: string): AttrStyles {
  const name = attribute.toLowerCase();

  if (name.includes('buyer title')) {
    return { Icon: Users, bgClass:'bg-blue-100', iconClass:'text-blue-600', titleClass:'text-blue-800' };
  } else if (name.includes('company size')) {
    return { Icon: Building, bgClass:'bg-purple-100', iconClass:'text-purple-600', titleClass:'text-purple-800' };
  } else if (name.includes('pain point')) {
    return { Icon: AlertCircle, bgClass:'bg-red-100', iconClass:'text-red-600', titleClass:'text-red-800' };
  } else if (name.includes('desired outcome')) {
    return { Icon: Trophy, bgClass:'bg-green-100', iconClass:'text-green-600', titleClass:'text-green-800' };
  } else if (name.includes('trigger')) {
    return { Icon: Zap, bgClass:'bg-orange-100', iconClass:'text-orange-600', titleClass:'text-orange-800' };
  } else if (name.includes('messaging emphasis')) {
    return {
      Icon: MessageSquare,
      bgClass: 'bg-teal-100',
      iconClass: 'text-teal-600',
      titleClass: 'text-teal-800',
    };
  } else if (name.includes('barrier')) {
    return { Icon: Shield, bgClass:'bg-indigo-100', iconClass:'text-indigo-600', titleClass:'text-indigo-800' };
  } else {
    return { Icon: MessageSquare, bgClass:'bg-gray-100', iconClass:'text-gray-600', titleClass:'text-gray-800' };
  }
} 