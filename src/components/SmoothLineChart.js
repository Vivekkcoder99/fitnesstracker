import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '../theme';

const SmoothLineChart = ({
  data = [],
  height = 100,
  color = theme.colors.primary,
  style,
}) => {
  if (!data || data.length === 0) return <View style={[style, { height }]} />;

  const [width, setWidth] = React.useState(0);
  const padding = 10;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal;

  const onLayout = (event) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const getPath = () => {
    if (width === 0) return '';
    const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);
    
    let path = `M ${padding} ${height - padding - ((data[0] - minVal) / range) * (height - padding * 2)}`;
    
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = padding + i * stepX;
      const y0 = height - padding - ((data[i] - minVal) / range) * (height - padding * 2);
      const x1 = padding + (i + 1) * stepX;
      const y1 = height - padding - ((data[i + 1] - minVal) / range) * (height - padding * 2);
      
      const xc = (x0 + x1) / 2;
      
      path += ` C ${xc} ${y0}, ${xc} ${y1}, ${x1} ${y1}`;
    }
    return path;
  };

  const d = getPath();
  const fillD = `${d} L ${width - padding} ${height} L ${padding} ${height} Z`;

  return (
    <View style={[styles.container, style, { height }]} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          <Path d={fillD} fill="url(#gradient)" />
          <Path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default SmoothLineChart;
