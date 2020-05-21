import React, { PureComponent } from 'react';
import {
  // LineChart,
  // Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const gradientOffset = (props) => {
  const dataMax = Math.max(...props.data.map((d) => d[props.dataKeyName]));
  const dataMin = Math.min(...props.data.map((d) => d[props.dataKeyName]));
  if (props.data.length) {
    debugger;
  }

  if (dataMax <= 0) {
    return 0;
  }
  if (dataMin >= 0) {
    return 1;
  }

  return dataMax / (dataMax - dataMin);
};

const Chart = (props) => {
  return (
    <AreaChart
      width={props.width}
      height={props.height}
      data={props.data}
      margin={{
        top: 5,
        right: 30,
        left: 20,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <defs>
        <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset={gradientOffset(props)}
            stopColor="green"
            stopOpacity={1}
          />
          <stop
            offset={gradientOffset(props)}
            stopColor="red"
            stopOpacity={1}
          />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey={props.dataKeyName}
        stroke="#000"
        fill="url(#splitColor)"
      />
    </AreaChart>
  );
};

export default Chart;
