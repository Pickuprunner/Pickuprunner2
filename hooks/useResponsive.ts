import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isNarrow = width < 340;
  const isCompact = width < 380;

  const select = <T>(regular: T, compact?: T, narrow?: T): T => {
    if (isNarrow && narrow !== undefined) return narrow;
    if (isCompact && compact !== undefined) return compact;
    return regular;
  };

  return {
    width,
    height,
    isNarrow,
    isCompact,
    select,
  };
}

export default useResponsive;
