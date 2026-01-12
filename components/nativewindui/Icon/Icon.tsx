import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import type { IconProps } from './types';
import { SF_TO_MATERIAL_ICONS } from './iconMappings';

import { useColorScheme } from '@/lib/useColorScheme';

function Icon({
  name,
  materialCommunityIcon,
  materialIcon,
  sfSymbol: _sfSymbol,
  size = 24,
  color,
  ...props
}: IconProps) {
  const { colors } = useColorScheme();
  const iconColor = color ?? colors.foreground;

  // If explicit Material icon props are provided, use them directly
  if (materialCommunityIcon) {
    return (
      <MaterialCommunityIcons
        size={size}
        color={iconColor}
        {...props}
        {...materialCommunityIcon}
      />
    );
  }
  if (materialIcon) {
    return <MaterialIcons size={size} color={iconColor} {...props} {...materialIcon} />;
  }
  
  // Map SF Symbol names to Material Community Icons
  if (name) {
    const materialIconName = SF_TO_MATERIAL_ICONS[name];
    if (materialIconName) {
      return (
        <MaterialCommunityIcons
          name={materialIconName as any}
          size={size}
          color={iconColor}
          {...props}
        />
      );
    }
  }
  
  // Fallback to help icon if name not found
  return <MaterialCommunityIcons name="help" size={size} color={iconColor} {...props} />;
}

export { Icon };
