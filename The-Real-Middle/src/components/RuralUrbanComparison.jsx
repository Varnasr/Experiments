import React from 'react';
import { MapPin } from 'lucide-react';

const RuralUrbanComparison = () => {
  const comparison = [
    { category: "Median Monthly Income", rural: 8200, urban: 12500, unit: "₹" },
    { category: "Food Cost (Basic)", rural: 2800, urban: 4200, unit: "₹" },
    { category: "Housing Cost", rural: 800, urban: 3500, unit: "₹" },
    { category: "Healthcare Access", rural: 15, urban: 65, unit: "km to hospital" },
    { category: "School Access", rural: 8, urban: 2, unit: "km to secondary school" },
    { category: "Unemployment Rate", rural: 5.2, urban: 7.8, unit: "%" }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-slate-300 text-lg"><strong className="text-amber-400">68% of Indians live in rural areas</strong> with very different economic realities from urban India.</p>
      </div>

      <div className="grid gap-4">
        {comparison.map((item, index) => (
          <div key={index} className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin className="text-slate-400" size={16} />
              {item.category}
            </h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-900/20 border border-green-700/50 rounded p-4">
                <h5 className="text-green-400 font-semibold mb-2">Rural India</h5>
                <p className="text-3xl font-bold text-green-400">{item.unit === "₹" ? `₹${item.rural.toLocaleString()}` : item.unit === "%" ? `${item.rural}%` : `${item.rural} ${item.unit}`}</p>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-700/50 rounded p-4">
                <h5 className="text-blue-400 font-semibold mb-2">Urban India</h5>
                <p className="text-3xl font-bold text-blue-400">{item.unit === "₹" ? `₹${item.urban.toLocaleString()}` : item.unit === "%" ? `${item.urban}%` : `${item.urban} ${item.unit}`}</p>
              </div>
            </div>
            
            {item.unit === "₹" && (
              <div className="mt-4 text-center">
                <p className="text-slate-400 text-sm">Difference: {item.urban > item.rural ? `Urban costs ${((item.urban / item.rural - 1) * 100).toFixed(0)}% more` : `Rural costs ${((item.rural / item.urban - 1) * 100).toFixed(0)}% more`}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-6">
        <h4 className="text-amber-300 font-semibold mb-3">The Rural-Urban Divide</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-300">• <strong>Agricultural distress</strong> forces migration to cities</p>
            <p className="text-slate-300">• <strong>Seasonal work</strong> creates income instability</p>
            <p className="text-slate-300">• <strong>Limited infrastructure</strong> reduces opportunities</p>
          </div>
          <div>
            <p className="text-slate-300">• <strong>Urban migration</strong> often leads to slum living</p>
            <p className="text-slate-300">• <strong>Higher urban costs</strong> offset income gains</p>
            <p className="text-slate-300">• <strong>Informal sector</strong> dominates urban poor employment</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuralUrbanComparison;