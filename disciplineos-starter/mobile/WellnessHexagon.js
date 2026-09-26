import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

const CENTER_X = 180;
const CENTER_Y = 166;
const RADIUS = 102;
const LABEL_RADIUS = 146;

function pointAt(index, radius) {
  const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y + radius * Math.sin(angle),
  };
}

function polygonPoints(dimensions, scores, radiusFactor = 1) {
  return dimensions
    .map((dimension, index) => {
      const point = pointAt(index, RADIUS * (scores[dimension.key] / 100) * radiusFactor);
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

export default function WellnessHexagon({ dimensions, scores, dark = false }) {
  const gridColor = dark ? '#354761' : '#dfe6f0';
  const textColor = dark ? '#f1f5fc' : '#344258';
  const mutedColor = dark ? '#a6b3c8' : '#6e7b91';
  const fillColor = dark ? '#82a4ff' : '#426ee5';
  const outlineColor = dark ? '#192538' : '#ffffff';

  return (
    <Svg
      viewBox="0 0 360 340"
      style={{ width: '100%', height: 320 }}
      accessibilityRole="image"
      accessibilityLabel="Read-only hexagon chart of your six wellness dimension scores"
    >
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <Polygon
          key={scale}
          points={polygonPoints(dimensions, Object.fromEntries(dimensions.map(({ key }) => [key, 100])), scale)}
          fill="none"
          stroke={gridColor}
          strokeWidth="1"
        />
      ))}

      {dimensions.map((dimension, index) => {
        const point = pointAt(index, RADIUS);
        return (
          <Line
            key={dimension.key}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={point.x}
            y2={point.y}
            stroke={gridColor}
            strokeWidth="1"
          />
        );
      })}

      <Polygon points={polygonPoints(dimensions, scores)} fill={fillColor} fillOpacity="0.17" stroke={fillColor} strokeWidth="2" />

      {dimensions.map((dimension, index) => {
        const scorePoint = pointAt(index, RADIUS * (scores[dimension.key] / 100));
        const labelPoint = pointAt(index, LABEL_RADIUS);
        const anchor = index === 0 || index === 3 ? 'middle' : index < 3 ? 'start' : 'end';
        const labelX = index === 1 || index === 2 ? 258 : index === 4 || index === 5 ? 102 : labelPoint.x;
        const labelY = index === 0 ? labelPoint.y - 5 : index === 3 ? labelPoint.y - 7 : labelPoint.y - 2;
        return (
          <Svg key={dimension.key}>
            <Circle cx={scorePoint.x} cy={scorePoint.y} r="5" fill={dimension.color} stroke={outlineColor} strokeWidth="2" />
            <SvgText x={labelX} y={labelY} textAnchor={anchor} fontSize="10.5" fontWeight="700" fill={textColor}>
              {dimension.label}
            </SvgText>
            <SvgText x={labelX} y={labelY + 15} textAnchor={anchor} fontSize="10.5" fill={mutedColor}>
              {scores[dimension.key]}
            </SvgText>
          </Svg>
        );
      })}
    </Svg>
  );
}