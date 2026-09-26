import Svg, { Circle, Line, Polygon } from 'react-native-svg';

export default function WellnessMark({ size = 30 }) {
  const colors = ['#e97861', '#9470c0', '#388fb9', '#2c9877', '#c29432', '#c85f82'];
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    return { x: 20 + 14 * Math.cos(angle), y: 20 + 14 * Math.sin(angle) };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityRole="image" accessibilityLabel="DisciplineOS wellness mark">
      <Polygon points={points.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="#7890bd" strokeWidth="1.4" />
      {points.map((point, index) => <Line key={`ray-${index}`} x1="20" y1="20" x2={point.x} y2={point.y} stroke="#aab8d0" strokeOpacity=".55" strokeWidth="1" />)}
      {points.map((point, index) => <Circle key={`point-${index}`} cx={point.x} cy={point.y} r="2.7" fill={colors[index]} />)}
      <Circle cx="20" cy="20" r="4" fill="#426ee5" stroke="#fff" strokeWidth="1.5" />
    </Svg>
  );
}
