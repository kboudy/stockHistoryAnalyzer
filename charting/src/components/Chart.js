import React from 'react';
import {
  BarChart,
  Bar,
  Brush,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

const getTicks = (props) => {
  const allTicks = props.data.map((n) => n.name);
  if (props.maxTicks) {
    const interval = Math.round(allTicks.length / props.maxTicks);
    const filteredTicks = allTicks.filter(
      (tick, index) => index % interval === 0
    );
    const lastTick = allTicks[allTicks.length - 1];
    if (!filteredTicks.includes(lastTick)) {
      filteredTicks.push(lastTick);
    }
    return filteredTicks;
  }
  return null;
};

const Chart = (props) => {
  return (
    <BarChart
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
      <XAxis dataKey="name" ticks={getTicks(props)} />
      <YAxis />
      <Tooltip />
      <ReferenceLine y={0} stroke="#000" />

      <Brush dataKey="name" height={30} stroke="#8884d8" />

      <Bar dataKey={props.dataKeyName} fill="#8884d8">
        {props.data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={entry[props.dataKeyName] > 0 ? '#2ca02c' : '#d62728'}
          />
        ))}
      </Bar>
    </BarChart>
  );
};

export default Chart;
