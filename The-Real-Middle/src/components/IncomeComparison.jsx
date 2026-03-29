import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, AlertCircle } from 'lucide-react';

const IncomeComparison = ({ userIncome = null }) => {
  const [person1Income, setPerson1Income] = useState(userIncome || '');
  const [person1Role, setPerson1Role] = useState('You');
  const [person2Income, setPerson2Income] = useState('');
  const [person2Role, setPerson2Role] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const commonRoles = [
    { role: 'Domestic Worker', avgIncome: 8000 },
    { role: 'Driver', avgIncome: 12000 },
    { role: 'Security Guard', avgIncome: 10000 },
    { role: 'Construction Worker', avgIncome: 9000 },
    { role: 'Restaurant Worker', avgIncome: 8500 },
    { role: 'Delivery Person', avgIncome: 15000 },
    { role: 'Office Peon', avgIncome: 12000 },
    { role: 'Custom', avgIncome: 0 }
  ];

  // Income distribution for comparison
  const incomeDistribution = [
    { bracket: 'Below ₹3k', population: 27.5, color: '#dc2626', min: 0, max: 3000 },
    { bracket: '₹3k-9k', population: 22.5, color: '#ea580c', min: 3000, max: 9000 },
    { bracket: '₹9k-15k', population: 28, color: '#d97706', min: 9000, max: 15000 },
    { bracket: '₹15k-25k', population: 12, color: '#eab308', min: 15000, max: 25000 },
    { bracket: '₹25k-50k', population: 7, color: '#65a30d', min: 25000, max: 50000 },
    { bracket: '₹50k-1L', population: 2.3, color: '#059669', min: 50000, max: 100000 },
    { bracket: '₹1L-2L', population: 0.6, color: '#0284c7', min: 100000, max: 200000 },
    { bracket: '₹2L+', population: 0.1, color: '#7c3aed', min: 200000, max: Infinity }
  ];

  const calculatePercentile = (income) => {
    let percentile = 0;
    for (let bracket of incomeDistribution) {
      if (income > bracket.max) {
        percentile += bracket.population;
      } else if (income >= bracket.min) {
        const position = (income - bracket.min) / (bracket.max - bracket.min);
        percentile += bracket.population * position;
        break;
      } else {
        break;
      }
    }
    return Math.min(percentile, 99.9);
  };

  const handleRoleSelect = (role, avgIncome) => {
    setPerson2Role(role);
    if (avgIncome > 0) {
      setPerson2Income(avgIncome.toString());
    }
  };

  const compareIncomes = () => {
    const income1 = parseInt(person1Income);
    const income2 = parseInt(person2Income);
    
    if (!income1 || !income2) return;
    
    setShowComparison(true);
  };

  const getComparisonData = () => {
    const income1 = parseInt(person1Income);
    const income2 = parseInt(person2Income);
    const percentile1 = calculatePercentile(income1);
    const percentile2 = calculatePercentile(income2);
    
    return {
      income1,
      income2,
      percentile1,
      percentile2,
      ratio: income1 / income2,
      gap: income1 - income2
    };
  };

  const chartData = incomeDistribution.map((bracket, index) => {
    const income1 = parseInt(person1Income);
    const income2 = parseInt(person2Income);
    
    return {
      ...bracket,
      isPerson1: income1 >= bracket.min && income1 < bracket.max,
      isPerson2: income2 >= bracket.min && income2 < bracket.max,
      order: index
    };
  });

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-slate-300 text-lg">
          Compare incomes to understand <strong className="text-amber-400">privilege gaps</strong> in Indian society.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Person 1 */}
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Person 1</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-200">Role/Title</label>
              <input
                type="text"
                value={person1Role}
                onChange={(e) => setPerson1Role(e.target.value)}
                className="w-full p-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-700 text-white"
                placeholder="e.g., Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-200">Monthly Income (₹)</label>
              <input
                type="number"
                value={person1Income}
                onChange={(e) => setPerson1Income(e.target.value)}
                className="w-full p-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-700 text-white"
                placeholder="e.g., 75000"
              />
            </div>
          </div>
        </div>

        {/* Person 2 */}
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Person 2</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-200">Select Role</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {commonRoles.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleRoleSelect(item.role, item.avgIncome)}
                    className={`p-2 text-sm rounded border transition-all ${
                      person2Role === item.role
                        ? 'border-amber-400 bg-amber-900/20 text-amber-300'
                        : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {item.role}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={person2Role}
                onChange={(e) => setPerson2Role(e.target.value)}
                className="w-full p-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-700 text-white"
                placeholder="Or enter custom role"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-200">Monthly Income (₹)</label>
              <input
                type="number"
                value={person2Income}
                onChange={(e) => setPerson2Income(e.target.value)}
                className="w-full p-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-700 text-white"
                placeholder="e.g., 8000"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={compareIncomes}
          disabled={!person1Income || !person2Income}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Compare Incomes
        </button>
      </div>

      {showComparison && person1Income && person2Income && (
        <div className="space-y-6 animate-fade-in">
          {/* Comparison Stats */}
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
            <h4 className="text-xl font-semibold text-white mb-6 text-center">Income Comparison</h4>
            
            {(() => {
              const data = getComparisonData();
              return (
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-slate-700/50 rounded">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <div className="text-lg font-semibold text-white">{person1Role}</div>
                    <div className="text-2xl font-bold text-blue-400">₹{data.income1.toLocaleString()}</div>
                    <div className="text-slate-400 text-sm">{data.percentile1.toFixed(1)}th percentile</div>
                  </div>
                  
                  <div className="text-center p-4 bg-amber-900/20 rounded border border-amber-600">
                    <div className="text-amber-300 font-semibold mb-2">Income Gap</div>
                    <div className="text-3xl font-bold text-amber-400">{data.ratio.toFixed(1)}x</div>
                    <div className="text-slate-300 text-sm">₹{data.gap.toLocaleString()} difference</div>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-700/50 rounded">
                    <Users className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <div className="text-lg font-semibold text-white">{person2Role}</div>
                    <div className="text-2xl font-bold text-green-400">₹{data.income2.toLocaleString()}</div>
                    <div className="text-slate-400 text-sm">{data.percentile2.toFixed(1)}th percentile</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Chart */}
          <div className="bg-slate-700/50 p-6 rounded-lg">
            <h5 className="text-lg font-semibold text-white mb-4 text-center">Position on Income Distribution</h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="bracket" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={10}
                  stroke="#e2e8f0"
                />
                <YAxis 
                  label={{ value: 'Population %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#e2e8f0' } }}
                  stroke="#e2e8f0"
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Population']}
                  labelStyle={{ color: '#000' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                />
                <Bar dataKey="population" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => {
                    let fill = entry.color;
                    let strokeWidth = 0;
                    let stroke = 'none';
                    
                    if (entry.isPerson1 && entry.isPerson2) {
                      fill = '#f59e0b'; // Both in same bracket
                      stroke = '#d97706';
                      strokeWidth = 3;
                    } else if (entry.isPerson1) {
                      fill = '#3b82f6'; // Person 1
                      stroke = '#1d4ed8';
                      strokeWidth = 2;
                    } else if (entry.isPerson2) {
                      fill = '#10b981'; // Person 2
                      stroke = '#059669';
                      strokeWidth = 2;
                    }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-blue-300 text-sm">{person1Role}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-green-300 text-sm">{person2Role}</span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-amber-900/20 border border-amber-700/50 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-amber-300 font-semibold mb-3">Privilege Gap Analysis</h4>
                {(() => {
                  const data = getComparisonData();
                  const facts = [];
                  
                  if (data.ratio >= 10) {
                    facts.push(`${person1Role} earns ${data.ratio.toFixed(0)} times more than ${person2Role} - highlighting extreme inequality`);
                  } else if (data.ratio >= 5) {
                    facts.push(`${person1Role} earns ${data.ratio.toFixed(1)} times more than ${person2Role} - a significant privilege gap`);
                  } else if (data.ratio >= 2) {
                    facts.push(`${person1Role} earns ${data.ratio.toFixed(1)} times more than ${person2Role}`);
                  }
                  
                  if (data.percentile1 > 90 && data.percentile2 < 50) {
                    facts.push(`While ${person1Role} is in the top 10% of earners, ${person2Role} is below the median income`);
                  }
                  
                  if (data.gap >= 50000) {
                    facts.push(`The monthly income difference of ₹${data.gap.toLocaleString()} represents ${Math.round(data.gap / data.income2)} months of ${person2Role}'s entire income`);
                  }
                  
                  facts.push(`In one month, ${person1Role} earns what ${person2Role} earns in ${(data.ratio).toFixed(1)} months`);
                  
                  return (
                    <div className="space-y-2">
                      {facts.map((fact, index) => (
                        <div key={index} className="text-slate-200">
                          • {fact}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeComparison;