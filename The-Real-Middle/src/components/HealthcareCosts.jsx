import React from 'react';
import { Heart } from 'lucide-react';

const HealthcareCostScenarios = ({ userIncome = 50000 }) => {
  const scenarios = [
    { condition: "Child's Pneumonia", publicCost: 2500, privateCost: 15000, description: "Hospital stay, medicines, tests", impact: "2-3 months of median income" },
    { condition: "Diabetes Management", publicCost: 800, privateCost: 3500, description: "Monthly insulin, monitoring, checkups", impact: "Permanent monthly burden" },
    { condition: "Accident/Fracture", publicCost: 8000, privateCost: 40000, description: "Surgery, casting, recovery", impact: "1 year of median income" },
    { condition: "Cancer Treatment", publicCost: 75000, privateCost: 400000, description: "Chemotherapy, radiation, surgery", impact: "7+ years of median income" }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-slate-300 text-lg">Healthcare costs in India can bankrupt families overnight. <strong className="text-amber-400">80% of Indians have no health insurance.</strong></p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {scenarios.map((scenario, index) => (
          <div key={index} className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="text-red-400" size={20} />
              <h4 className="text-lg font-semibold text-white">{scenario.condition}</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-slate-300">Public Hospital:</span><span className="text-green-400 font-semibold">₹{scenario.publicCost.toLocaleString()}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-300">Private Hospital:</span><span className="text-red-400 font-semibold">₹{scenario.privateCost.toLocaleString()}</span></div>
              <p className="text-slate-400 text-sm">{scenario.description}</p>
              <div className="bg-slate-700/50 p-3 rounded mt-4">
                <p className="text-amber-300 text-sm font-medium">{scenario.impact}</p>
                <p className="text-slate-400 text-xs mt-1">For median income (₹9,000/month): {Math.round(scenario.publicCost / 9000)} months of total income</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
        <h4 className="text-red-300 font-semibold mb-3">The Healthcare Poverty Trap</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-300">• <strong>63% of health spending</strong> is out-of-pocket</p>
            <p className="text-slate-300">• <strong>39 million Indians</strong> fall into poverty annually due to healthcare costs</p>
          </div>
          <div>
            <p className="text-slate-300">• <strong>Average family</strong> borrows ₹18,000 for hospitalization</p>
            <p className="text-slate-300">• <strong>Rural families</strong> sell land/livestock to pay medical bills</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthcareCostScenarios;