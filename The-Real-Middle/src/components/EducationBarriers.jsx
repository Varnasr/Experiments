import React from 'react';
import { BookOpen } from 'lucide-react';

const EducationCostBarriers = () => {
  const educationCosts = [
    { level: "Primary School", govt: 500, private: 15000, books: 2000, uniform: 1500 },
    { level: "Secondary School", govt: 1200, private: 35000, books: 5000, uniform: 3000 },
    { level: "Higher Secondary", govt: 2500, private: 75000, books: 8000, uniform: 0 },
    { level: "Engineering/Medical", govt: 15000, private: 400000, books: 15000, uniform: 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-slate-300 text-lg">Education is supposed to break the poverty cycle, but <strong className="text-amber-400">cost barriers keep poor children out of school.</strong></p>
      </div>

      <div className="space-y-4">
        {educationCosts.map((level, index) => (
          <div key={index} className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="text-blue-400" size={20} />
              <h4 className="text-lg font-semibold text-white">{level.level}</h4>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 p-4 rounded">
                <h5 className="text-green-400 font-semibold mb-2">Government School</h5>
                <p className="text-2xl font-bold text-green-400">₹{level.govt.toLocaleString()}</p>
                <p className="text-slate-400 text-sm">Annual fees</p>
              </div>
              
              <div className="bg-slate-700/50 p-4 rounded">
                <h5 className="text-red-400 font-semibold mb-2">Private School</h5>
                <p className="text-2xl font-bold text-red-400">₹{level.private.toLocaleString()}</p>
                <p className="text-slate-400 text-sm">Annual fees</p>
              </div>
              
              <div className="bg-slate-700/50 p-4 rounded">
                <h5 className="text-amber-400 font-semibold mb-2">Additional Costs</h5>
                <p className="text-slate-300">Books: ₹{level.books.toLocaleString()}</p>
                {level.uniform > 0 && <p className="text-slate-300">Uniform: ₹{level.uniform.toLocaleString()}</p>}
                <p className="text-slate-300">Transport: ₹3,000</p>
              </div>
            </div>
            
            <div className="mt-4 bg-amber-900/20 border border-amber-700/50 rounded p-3">
              <p className="text-amber-300 text-sm">For median income family (₹9,000/month): Government school = {Math.round(level.govt / 9000)} months income, Private school = {Math.round(level.private / 9000)} months income</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
        <h4 className="text-red-300 font-semibold mb-3">Why Poor Children Drop Out</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-300">• <strong>12 million children</strong> out of school in India</p>
            <p className="text-slate-300">• <strong>40% drop out</strong> by age 14 for economic reasons</p>
            <p className="text-slate-300">• <strong>Girls more likely</strong> to drop out for household work</p>
          </div>
          <div>
            <p className="text-slate-300">• <strong>Child labor</strong> earns ₹100-200/day for family</p>
            <p className="text-slate-300">• <strong>Opportunity cost</strong> of school vs immediate income</p>
            <p className="text-slate-300">• <strong>Generational cycle</strong> continues poverty</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationCostBarriers;