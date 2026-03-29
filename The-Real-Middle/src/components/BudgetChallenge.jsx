import React, { useState } from 'react';

const BudgetChallenge = ({ results }) => {
  const [selectedIncome, setSelectedIncome] = useState(9000);
  const [allocations, setAllocations] = useState({
    food: 0, rent: 0, transport: 0, healthcare: 0, education: 0, clothes: 0, savings: 0
  });

  const minimumCosts = { food: 3500, rent: 2500, transport: 800, healthcare: 500, education: 400, clothes: 300, savings: 0 };
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const totalMinimum = Object.values(minimumCosts).reduce((sum, val) => sum + val, 0);
  const remaining = selectedIncome - totalAllocated;
  const isImpossible = totalMinimum > selectedIncome;

  const handleAllocationChange = (category, value) => {
    setAllocations(prev => ({ ...prev, [category]: parseInt(value) || 0 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
        <label className="text-slate-200 font-semibold">Monthly Income:</label>
        <select value={selectedIncome} onChange={(e) => setSelectedIncome(parseInt(e.target.value))} className="bg-slate-700 text-white p-3 rounded-lg border border-slate-500">
          <option value={3000}>₹3,000 (Bottom 27.5%)</option>
          <option value={9000}>₹9,000 (Median - 50%)</option>
          <option value={15000}>₹15,000 (Top 22%)</option>
          <option value={25000}>₹25,000 (Top 10%)</option>
          {results && <option value={results.income}>₹{results.income.toLocaleString()} (Your Income)</option>}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-xl font-semibold text-white">Allocate Your Budget:</h4>
          {Object.entries(minimumCosts).map(([category, minCost]) => (
            <div key={category} className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-slate-200 capitalize font-semibold">{category}:</label>
                <span className="text-red-400 text-sm">Min: ₹{minCost}</span>
              </div>
              <input type="range" min="0" max={selectedIncome} value={allocations[category]} onChange={(e) => handleAllocationChange(category, e.target.value)} className="w-full mb-2" />
              <div className="flex justify-between">
                <span className="text-slate-200">₹{allocations[category]}</span>
                <span className={allocations[category] < minCost ? "text-red-400" : "text-green-400"}>
                  {allocations[category] >= minCost ? "✅" : "❌ Too low!"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
          <h4 className="text-xl font-semibold text-white mb-4">Budget Summary:</h4>
          <div className="space-y-3 text-lg">
            <div className="flex justify-between"><span className="text-slate-200">Total Income:</span><span className="text-green-400 font-bold">₹{selectedIncome.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-200">Allocated:</span><span className="text-blue-400 font-bold">₹{totalAllocated.toLocaleString()}</span></div>
            <div className="flex justify-between border-t border-slate-600 pt-3"><span className="text-slate-200">Remaining:</span><span className={`${remaining >= 0 ? "text-green-400" : "text-red-400"} font-bold`}>₹{remaining.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-200">Minimum Needed:</span><span className="text-red-400 font-bold">₹{totalMinimum.toLocaleString()}</span></div>
            
            {isImpossible && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mt-4">
                <p className="text-red-300 font-semibold text-center">IMPOSSIBLE! Basic survival costs ₹{totalMinimum.toLocaleString()} but income is only ₹{selectedIncome.toLocaleString()}</p>
                <p className="text-red-200 text-sm text-center mt-2">This is the reality for {selectedIncome <= 9000 ? "50%" : "27.5%"} of Indians</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetChallenge;