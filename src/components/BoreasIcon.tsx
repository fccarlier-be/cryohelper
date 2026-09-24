import React from 'react';
import Svg, { G, Line, Circle } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export default function BoreasIcon({ size = 32, color = '#00D4FF' }: Props) {
  const s = { stroke: color, strokeWidth: 5.5, strokeLinecap: 'round' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="5" fill={color} />
      {[0, 60, 120, 180, 240, 300].map(angle => (
        <G key={angle} transform={`rotate(${angle}, 50, 50)`}>
          {/* Branche principale */}
          <Line x1="50" y1="50" x2="50" y2="16" {...s} />
          {/* Ramifications latérales au milieu */}
          <Line x1="50" y1="33" x2="42" y2="26" {...s} />
          <Line x1="50" y1="33" x2="58" y2="26" {...s} />
          {/* Fourche au bout */}
          <Line x1="50" y1="16" x2="44" y2="22" {...s} />
          <Line x1="50" y1="16" x2="56" y2="22" {...s} />
        </G>
      ))}
    </Svg>
  );
}
