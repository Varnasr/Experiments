import React, { useState } from 'react';

const IntergenerationalPovertyTrap = () => {
  const generations = [
    { generation: "Grandparents", education: "Illiterate", occupation: "Subsistence farming", income: 2000, assets: "Small land plot" },
    { generation: "Parents", education: "Primary school dropout", occupation: "Agricultural labor", income: 6000, assets: "No land, debt" },
    { generation: "Current", education: "Secondary school", occupation: "Domestic work/labor", income: 8000, assets: "Rented room" },
    { generation: "Children", education: "At risk of dropout", occupation: "Potential child labor", income: 200, assets: "None" }
  ];

  const [selectedPath, setSelectedPath] = useState(null);

  const interventions = [
    { intervention: "Education Support", cost: 15000, impact: "Child completes school", futureIncome: 25000, description: "Scholarships, meals, books" },
    { intervention: "Healthcare Access", cost: 8000, impact: "Family stays healthy", futureIncome: 12000, description: "Insurance, preventive care" },
    { intervention: "Skills Training", cost: 20000, impact: "Parent gets better job", futureIncome: 18000, description: "Vocational training program" },
    { intervention: "No Intervention", cost: 0, impact: "Cycle continues", futureIncome: 8000, description: "Business as usual" }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-slate-300 text-lg">Poverty is often <strong className="text-amber-400">inherited across generations.</strong> Breaking this cycle requires targeted interventions.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
        <h4 className="text-white font-semibold mb-6">The Poverty Cycle Across Generations</h4>
        
        <div className="grid md:grid-cols-4 gap-4">
          {generations.map((gen, index) => (
            <div key={index} className="bg-slate-700/50 border border-slate-500 rounded p-4">
              <h5 className="text-slate-200 font-semibold mb-3">{gen.generation}</h5>
              <div className="space-y-2 text-sm">
                <p className="text-slate-300"><strong>Education:</strong> {gen.education}</p>
                <p className="text-slate-300"><strong>Work:</strong> {gen.occupation}</p>
                <p className="text-slate-300"><strong>Income:</strong> ₹{gen.income.toLocaleString()}/month</p>
                <p className="text-slate-300"><strong>Assets:</strong> {gen.assets}</p>
              </div>
              
              {index < generations.length - 1 && (
                <div className="text-center mt-4">
                  <div className="text-slate-400">↓</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
        <h4 className="text-white font-semibold mb-6">Breaking the Cycle: Intervention Scenarios</h4>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {interventions.map((option, index) => (
            <button key={index} onClick={() => setSelectedPath(index)} className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${selectedPath === index ? option.intervention === "No Intervention" ? "border-red-400 bg-red-900/20" : "border-blue-400 bg-blue-900/20" : "border-slate-600 bg-slate-700/50 hover:border-slate-400"}`}>
              <h5 className="text-white font-semibold mb-2">{option.intervention}</h5>
              <p className="text-slate-300 text-sm mb-2">{option.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cost: ₹{option.cost.toLocaleString()}</span>
                <span className={option.intervention === "No Intervention" ? "text-red-400" : "text-green-400"}>Future: ₹{option.futureIncome.toLocaleString()}/month</span>
              </div>
            </button>
          ))}
        </div>

        {selectedPath !== null && (
          <div className="bg-slate-700/50 border border-slate-500 rounded-lg p-6 animate-fade-in">
            <h5 className="text-white font-semibold mb-3">Impact Analysis: {interventions[selectedPath].intervention}</h5>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h6 className="text-slate-300 font-semibold mb-2">Immediate Impact</h6>
                <p className="text-slate-400">{interventions[selectedPath].impact}</p>
                <p className="text-slate-400 mt-2">Investment needed: ₹{interventions[selectedPath].cost.toLocaleString()}</p>
              </div>
              <div>
                <h6 className="text-slate-300 font-semibold mb-2">Long-term Outcome</h6>
                <p className="text-slate-400">Next generation income: ₹{interventions[selectedPath].futureIncome.toLocaleString()}/month</p>
                <p className={interventions[selectedPath].futureIncome > 8000 ? "text-green-400" : "text-red-400"}>{interventions[selectedPath].futureIncome > 8000 ? `${Math.round((interventions[selectedPath].futureIncome / 8000 - 1) * 100)}% income increase` : "Poverty cycle continues"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-6">
        <h4 className="text-amber-300 font-semibold mb-3">Why Poverty Perpetuates</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-300">• <strong>No savings</strong> for children's education</p>
            <p className="text-slate-300">• <strong>Child labor</strong> prioritized over schooling</p>
            <p className="text-slate-300">• <strong>Health emergencies</strong> drain resources</p>
          </div>
          <div>
            <p className="text-slate-300">• <strong>No social capital</strong> or professional networks</p>
            <p className="text-slate-300">• <strong>Limited credit access</strong> for business</p>
            <p className="text-slate-300">• <strong>Geographic isolation</strong> from opportunities</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntergenerationalPovertyTrap;