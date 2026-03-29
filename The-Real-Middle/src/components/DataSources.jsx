import React from 'react';

const DataSources = () => {
  const primarySources = [
    {
      category: "Income Distribution Data",
      sources: [
        {
          title: "Income and Wealth Inequality in India, 1922-2023: The Rise of the Billionaire Raj",
          authors: "Nitin Kumar Bharti, Lucas Chancel, Thomas Piketty, Anmol Somanchi",
          organization: "World Inequality Lab Working Paper No. 2024/09",
          year: "March 2024",
          description: "Comprehensive analysis of income inequality showing top 1% income share at 22.6% and wealth share at 40.1%",
          keyFindings: "Top 1% income share highest since 1922; median income ₹9,000/month; bottom 50% earn only 15% of national income",
          url: "https://wid.world/www-site/uploads/2024/03/WorldInequalityLab_WP2024_09_Income-and-Wealth-Inequality-in-India-1922-2023_Final.pdf"
        }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6">
        <h4 className="text-blue-300 font-semibold mb-3">Academic Transparency</h4>
        <p className="text-slate-300 text-sm">This tool is based on peer-reviewed research and official government statistics. All sources are verifiable and follow established academic methodologies for studying income inequality.</p>
      </div>

      <div className="space-y-6">
        <h4 className="text-xl font-semibold text-white">Data Sources</h4>
        {primarySources.map((category, categoryIndex) => (
          <div key={categoryIndex} className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
            <h5 className="text-lg font-semibold text-amber-400 mb-4">{category.category}</h5>
            <div className="space-y-4">
              {category.sources.map((source, sourceIndex) => (
                <div key={sourceIndex} className="bg-slate-700/50 border border-slate-500 rounded p-4">
                  <h6 className="text-white font-semibold mb-2">{source.title}</h6>
                  {source.authors && <p className="text-slate-300 text-sm mb-2"><strong>Authors:</strong> {source.authors}</p>}
                  <p className="text-slate-300 text-sm mb-2"><strong>Organization:</strong> {source.organization}</p>
                  {source.year && <p className="text-slate-300 text-sm mb-2"><strong>Year:</strong> {source.year}</p>}
                  <p className="text-slate-300 text-sm mb-2">{source.description}</p>
                  {source.keyFindings && <p className="text-amber-200 text-sm mb-2"><strong>Key Findings:</strong> {source.keyFindings}</p>}
                  {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline">View Source →</a>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataSources;