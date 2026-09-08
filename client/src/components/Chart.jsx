import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Chart = ({ data = [] }) => {
  return (
    <ResponsiveContainer width={"100%"} height={340}>
      <BarChart width={150} height={40} data={data} barSize={28}>
        <XAxis dataKey="name" axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(79, 70, 229, 0.06)" }}
          contentStyle={{
            borderRadius: 16,
            border: "1px solid #e4dfd6",
            boxShadow: "none",
          }}
        />
        <Legend />
        <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="#e4dfd6" />
        <Bar dataKey="total" fill="#4f46e5" radius={[10, 10, 10, 10]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
