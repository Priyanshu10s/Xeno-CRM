import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, Play, BarChart2, ShieldAlert, Sparkles, X, CheckCircle2, Wand2, RefreshCw } from 'lucide-react';

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [name, setName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('Hi [first_name], enjoy a special discount on your next visit in [city]!');
  
  // Segment rules state
  const [rules, setRules] = useState({
    min_spend: '',
    min_orders: '',
    city: '',
    max_inactive_days: ''
  });
  
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Stats drawer states
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campStats, setCampStats] = useState(null);
  const [campLogs, setCampLogs] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // AI Pipeline 1: Natural Language Segment States
  const [nlpQuery, setNlpQuery] = useState('');
  const [compilingNlp, setCompilingNlp] = useState(false);
  const [nlpResult, setNlpResult] = useState(null);

  // AI Pipeline 2: Context-Aware Copywriter States
  const [showAiCopywriter, setShowAiCopywriter] = useState(false);
  const [copyParams, setCopyParams] = useState({
    segment_name: '',
    average_spend: '500',
    top_purchased_product: 'Luxury Watches',
    target_channel: 'WhatsApp',
    tone_type: 'VIP'
  });
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyVariations, setCopyVariations] = useState([]);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('/campaigns/');
      setCampaigns(res.data);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Recalculate dry-run segment size whenever manual rules change
  useEffect(() => {
    const estimateSegment = async () => {
      setLoadingEstimate(true);
      try {
        const payload = {};
        if (rules.min_spend) payload.min_spend = parseFloat(rules.min_spend);
        if (rules.min_orders) payload.min_orders = parseInt(rules.min_orders);
        if (rules.city) payload.city = rules.city.trim();
        if (rules.max_inactive_days) payload.max_inactive_days = parseInt(rules.max_inactive_days);

        const res = await axios.post('/campaigns/estimate_segment/', payload);
        setEstimatedSize(res.data.matched_count);
      } catch (err) {
        console.error("Error checking segment size estimation:", err);
        setEstimatedSize(0);
      } finally {
        setLoadingEstimate(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      estimateSegment();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [rules]);

  // Execute NLP Segment Compiler
  const handleNlpSegmentCompile = async () => {
    if (!nlpQuery.trim()) return;
    setCompilingNlp(true);
    setNlpResult(null);
    try {
      const res = await axios.post('/campaigns/nlp_segment/', { query: nlpQuery });
      if (res.data.error) {
        setFeedback({ type: 'error', text: `AI Compilation error: ${res.data.error}` });
      } else {
        setNlpResult(res.data);
        setFeedback({ type: 'success', text: 'AI Segment successfully compiled!' });
        
        // Auto-populate manual rules fields with values extracted by AI
        const raw = res.data.filters || {};
        setRules({
          min_spend: raw.total_spend__gte || '',
          min_orders: raw.order_count__gte || '',
          city: raw.city__iexact || raw.city__icontains || '',
          max_inactive_days: ''
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Server error compiling segment: ${err.message}` });
    } finally {
      setCompilingNlp(false);
    }
  };

  // Generate Copy Variations
  const handleGenerateCopy = async () => {
    setGeneratingCopy(true);
    setCopyVariations([]);
    try {
      const payload = {
        ...copyParams,
        segment_name: name || copyParams.segment_name || 'My Segment'
      };
      const res = await axios.post('/campaigns/generate_copy/', payload);
      setCopyVariations(res.data.variations || []);
    } catch (err) {
      alert(`Failed to generate copy: ${err.message}`);
    } finally {
      setGeneratingCopy(false);
    }
  };

  // Create Campaign
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload = {
        name,
        message_template: messageTemplate,
        segment_rules: {
          min_spend: rules.min_spend ? parseFloat(rules.min_spend) : null,
          min_orders: rules.min_orders ? parseInt(rules.min_orders) : null,
          city: rules.city ? rules.city.trim() : null,
          max_inactive_days: rules.max_inactive_days ? parseInt(rules.max_inactive_days) : null
        }
      };

      await axios.post('/campaigns/', payload);
      setFeedback({ type: 'success', text: 'Campaign successfully built!' });
      setName('');
      setRules({ min_spend: '', min_orders: '', city: '', max_inactive_days: '' });
      setNlpQuery('');
      setNlpResult(null);
      fetchCampaigns();
    } catch (err) {
      setFeedback({ type: 'error', text: `Failed to build campaign: ${err.message}` });
    }
  };

  // Trigger campaign execution
  const handleSendCampaign = async (id) => {
    try {
      await axios.post(`/campaigns/${id}/send/`);
      fetchCampaigns();
      alert("Campaign execution started. Background tasks dispatched to worker queue.");
    } catch (err) {
      alert(`Failed to execute campaign: ${err.response?.data?.error || err.message}`);
    }
  };

  // Open Stats overlay and load logs
  const handleViewStats = async (campaign) => {
    setSelectedCampaign(campaign);
    setStatsLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        axios.get(`/campaigns/${campaign.id}/stats/`),
        axios.get(`/delivery-logs/?campaign_id=${campaign.id}`)
      ]);
      setCampStats(statsRes.data);
      setCampLogs(logsRes.data);
    } catch (err) {
      console.error("Error gathering campaign telemetry reports:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Campaign Engine</h2>
          <p className="text-sm text-crm-grayText mt-1">Design segments, write message templates, and track delivery logs with asynchronous workers.</p>
        </div>
        <div className="flex items-center space-x-2 bg-gradient-to-r from-crm-indigo/20 to-crm-cyan/20 border border-crm-border px-4 py-2 rounded-xl text-xs font-bold text-crm-cyan">
          <Sparkles className="h-4 w-4 text-crm-cyan animate-pulse" />
          <span>AI CO-PILOT ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Campaign Builder Card */}
        <div className="lg:col-span-1 bg-crm-card border border-crm-border rounded-2xl p-6 h-fit space-y-5">
          <div className="flex items-center justify-between border-b border-crm-border/40 pb-3">
            <div className="flex items-center space-x-2">
              <Megaphone className="h-5 w-5 text-crm-indigo" />
              <h4 className="text-base font-bold text-white">Segment Campaign Builder</h4>
            </div>
          </div>

          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Campaign Name</label>
              <input
                type="text" required placeholder="e.g., VIP Loyalty Outbound"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-crm-indigo"
              />
            </div>

            {/* AI Natural Language Segmentation Panel */}
            <div className="space-y-3 p-4 bg-crm-indigo/5 border border-crm-indigo/20 rounded-xl">
              <div className="flex items-center space-x-2">
                <Wand2 className="h-4 w-4 text-crm-cyan animate-bounce" />
                <span className="text-[11px] uppercase font-extrabold text-crm-cyan tracking-wider">AI Segment Compiler</span>
              </div>
              
              <div className="space-y-2">
                <textarea
                  rows="2"
                  placeholder="Describe your target in Hinglish/English (e.g. 'Delhi customers who spent more than 5000')"
                  value={nlpQuery}
                  onChange={e => setNlpQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-crm-border/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crm-cyan"
                />
                
                <button
                  type="button"
                  disabled={compilingNlp || !nlpQuery.trim()}
                  onClick={handleNlpSegmentCompile}
                  className="w-full py-1.5 bg-gradient-to-r from-crm-indigo to-crm-cyan text-white text-xs font-bold rounded-lg transition-all hover:opacity-90 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {compilingNlp ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Compiling...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3 w-3" />
                      <span>Compile AI Segment</span>
                    </>
                  )}
                </button>
              </div>

              {nlpResult && (
                <div className="mt-2 p-2 bg-slate-950 border border-crm-border/20 rounded text-[11px] space-y-1">
                  <p className="text-slate-300 font-medium">{nlpResult.explanation}</p>
                  {nlpResult.matched_count !== undefined && (
                    <div className="flex justify-between text-[10px] text-crm-cyan">
                      <span>Matches Found:</span>
                      <span className="font-mono font-bold">{nlpResult.matched_count} Shoppers</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Segment Constraints */}
            <div className="space-y-3 p-3.5 bg-slate-950/50 rounded-xl border border-crm-border/40">
              <span className="block text-[10px] uppercase font-extrabold text-crm-grayText tracking-wider">Active Segment Rules (AND)</span>
              
              <div>
                <label className="block text-[9px] font-bold text-crm-grayText mb-1">Min Spend ($)</label>
                <input
                  type="number" placeholder="No limit"
                  value={rules.min_spend}
                  onChange={e => setRules({...rules, min_spend: e.target.value})}
                  className="w-full bg-slate-900 border border-crm-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-crm-cyan"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-crm-grayText mb-1">Min Order Purchases</label>
                <input
                  type="number" placeholder="No limit"
                  value={rules.min_orders}
                  onChange={e => setRules({...rules, min_orders: e.target.value})}
                  className="w-full bg-slate-900 border border-crm-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-crm-cyan"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-crm-grayText mb-1">Target Location (City)</label>
                <input
                  type="text" placeholder="All cities"
                  value={rules.city}
                  onChange={e => setRules({...rules, city: e.target.value})}
                  className="w-full bg-slate-900 border border-crm-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-crm-cyan"
                />
              </div>

              {/* Dynamic Live Estimation Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-crm-border/40">
                <span className="text-[10px] text-crm-grayText">Target Size:</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  loadingEstimate ? 'bg-slate-800 text-crm-grayText animate-pulse' :
                  estimatedSize > 0 ? 'bg-crm-cyan/10 text-crm-cyan' : 'bg-red-500/10 text-crm-red'
                }`}>
                  {loadingEstimate ? 'Calculating...' : `${estimatedSize} Shoppers`}
                </span>
              </div>
            </div>

            {/* Campaign Message & AI Copywriter Panel */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase font-bold text-crm-grayText">Message Content Template</label>
                <button
                  type="button"
                  onClick={() => setShowAiCopywriter(!showAiCopywriter)}
                  className="text-[10px] text-crm-cyan hover:underline flex items-center space-x-1"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>{showAiCopywriter ? "Hide AI Copywriter" : "Open AI Copywriter"}</span>
                </button>
              </div>

              {showAiCopywriter && (
                <div className="p-3 bg-slate-950/70 border border-crm-border rounded-xl space-y-3 animate-fade-in text-xs">
                  <span className="block text-[10px] uppercase font-bold text-crm-purple tracking-wider">Context Parameters</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] text-crm-grayText">Avg Spend ($)</label>
                      <input
                        type="text"
                        value={copyParams.average_spend}
                        onChange={e => setCopyParams({...copyParams, average_spend: e.target.value})}
                        className="w-full bg-slate-900 border border-crm-border/40 rounded p-1 text-[10px] text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-crm-grayText">Top Product</label>
                      <input
                        type="text"
                        value={copyParams.top_purchased_product}
                        onChange={e => setCopyParams({...copyParams, top_purchased_product: e.target.value})}
                        className="w-full bg-slate-900 border border-crm-border/40 rounded p-1 text-[10px] text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-crm-grayText">Channel</label>
                      <select
                        value={copyParams.target_channel}
                        onChange={e => setCopyParams({...copyParams, target_channel: e.target.value})}
                        className="w-full bg-slate-900 border border-crm-border/40 rounded p-1 text-[10px] text-white"
                      >
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="SMS">SMS</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] text-crm-grayText">Tone</label>
                      <select
                        value={copyParams.tone_type}
                        onChange={e => setCopyParams({...copyParams, tone_type: e.target.value})}
                        className="w-full bg-slate-900 border border-crm-border/40 rounded p-1 text-[10px] text-white"
                      >
                        <option value="VIP">VIP (Respectful)</option>
                        <option value="Churning">Churning (Urgent)</option>
                        <option value="Discount">Discount (Promo)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={generatingCopy}
                    onClick={handleGenerateCopy}
                    className="w-full py-1.5 bg-crm-purple/20 text-crm-purple border border-crm-purple/30 font-bold rounded hover:bg-crm-purple/30 transition text-[10px]"
                  >
                    {generatingCopy ? "Generating variations..." : "Generate AI Copy Options"}
                  </button>

                  {copyVariations.length > 0 && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-crm-border/30">
                      {copyVariations.map((v, i) => (
                        <div
                          key={i}
                          onClick={() => { setMessageTemplate(v); setShowAiCopywriter(false); }}
                          className="p-2 bg-slate-900 border border-crm-border/30 rounded cursor-pointer hover:border-crm-indigo transition text-[10px] italic text-slate-300"
                        >
                          {v}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <textarea
                rows="3" required
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crm-indigo font-mono"
              />
              <span className="block text-[9px] text-crm-grayText">
                Placeholders: <span className="font-mono text-crm-indigo">[first_name]</span>, <span className="font-mono text-crm-indigo">[city]</span>, <span className="font-mono text-crm-indigo">[email]</span>
              </span>
            </div>

            {feedback && (
              <div className={`p-3 rounded-lg flex items-center space-x-2 text-xs ${
                feedback.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/20 text-crm-green' : 'bg-red-950/40 border border-red-500/20 text-crm-red'
              }`}>
                {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
                <span>{feedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-crm-indigo text-white font-bold rounded-xl transition hover:opacity-90 active:scale-[0.98] text-sm shadow-neon-indigo"
            >
              Build & Save Campaign
            </button>
          </form>
        </div>

        {/* Campaign Lists Dashboard */}
        <div className="lg:col-span-2 bg-crm-card border border-crm-border rounded-2xl p-6 space-y-6">
          <div>
            <h4 className="text-lg font-bold text-white">Existing Campaigns Hub</h4>
            <p className="text-xs text-crm-grayText">Manage setups, execute campaigns, and analyze webhook delivery stats.</p>
          </div>

          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <p className="text-sm text-crm-grayText text-center py-12">No campaigns found. Build a campaign using the wizard.</p>
            ) : (
              campaigns.map(camp => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-crm-border/60 hover:bg-slate-900/60 transition-all flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-white text-base">{camp.name}</span>
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-extrabold rounded-full ${
                        camp.status === 'COMPLETED' ? 'bg-crm-green/10 text-crm-green border border-crm-green/20' :
                        camp.status === 'RUNNING' ? 'bg-crm-cyan/10 text-crm-cyan border border-crm-cyan/20 animate-pulse' :
                        camp.status === 'FAILED' ? 'bg-crm-red/10 text-crm-red border border-crm-red/20' :
                        'bg-slate-800 text-crm-grayText border border-slate-700'
                      }`}>
                        {camp.status}
                      </span>
                    </div>

                    <div className="text-xs text-crm-grayText space-y-1">
                      <div className="font-mono text-[10px] max-w-md truncate bg-slate-950/40 p-1.5 rounded border border-crm-border/30">
                        {camp.message_template}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-wider pt-1 text-crm-cyan">
                        <span>Spend: &gt;={camp.segment_rules.min_spend || '0'}</span>
                        <span>•</span>
                        <span>Orders: &gt;={camp.segment_rules.min_orders || '0'}</span>
                        <span>•</span>
                        <span>City: {camp.segment_rules.city || 'Any'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {camp.status !== 'RUNNING' && camp.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleSendCampaign(camp.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-crm-cyan text-slate-950 font-bold rounded-xl text-xs transition hover:opacity-90 active:scale-[0.98] shadow-neon-cyan"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Execute</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleViewStats(camp)}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition border border-crm-border"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      <span>Stats Drawer</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Analytics Drawer Overlay */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-full bg-slate-950 border-l border-crm-border p-8 overflow-y-auto space-y-8 animate-slide-in">
            {/* Drawer Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-crm-cyan uppercase tracking-widest font-extrabold">Campaign Audit Ledger</span>
                <h3 className="text-2xl font-black text-white mt-1">{selectedCampaign.name}</h3>
              </div>
              <button
                onClick={() => { setSelectedCampaign(null); setCampStats(null); setCampLogs([]); }}
                className="p-2 bg-slate-900 border border-crm-border rounded-xl text-crm-grayText hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {statsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-crm-indigo"></div>
                <p className="text-xs text-crm-grayText">Gathering campaign telemetry...</p>
              </div>
            ) : (
              campStats && (
                <div className="space-y-8">
                  {/* Campaign Stats Widgets */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900/60 border border-crm-border p-4 rounded-xl text-center">
                      <span className="block text-[9px] uppercase font-bold text-crm-grayText">Target Size</span>
                      <span className="block text-2xl font-black text-white mt-1">{campStats.total_sent}</span>
                    </div>
                    <div className="bg-slate-900/60 border border-crm-border p-4 rounded-xl text-center">
                      <span className="block text-[9px] uppercase font-bold text-crm-grayText">Delivered / Read</span>
                      <span className="block text-2xl font-black text-crm-green mt-1">
                        {campStats.delivered + campStats.read}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 border border-crm-border p-4 rounded-xl text-center">
                      <span className="block text-[9px] uppercase font-bold text-crm-grayText">Success Rate</span>
                      <span className="block text-2xl font-black text-crm-cyan mt-1">{campStats.success_rate_percentage}%</span>
                    </div>
                  </div>

                  {/* Delivery details status legend */}
                  <div className="p-4 rounded-xl bg-slate-900/30 border border-crm-border/60 flex items-center justify-around text-xs">
                    <div className="text-center">
                      <span className="text-crm-cyan font-bold text-base block">{campStats.delivered}</span>
                      <span className="text-[10px] text-crm-grayText">Delivered</span>
                    </div>
                    <div className="text-center">
                      <span className="text-crm-purple font-bold text-base block">{campStats.read}</span>
                      <span className="text-[10px] text-crm-grayText">Read</span>
                    </div>
                    <div className="text-center">
                      <span className="text-crm-red font-bold text-base block">{campStats.failed}</span>
                      <span className="text-[10px] text-crm-grayText">Failed</span>
                    </div>
                    <div className="text-center">
                      <span className="text-amber-500 font-bold text-base block">{campStats.pending}</span>
                      <span className="text-[10px] text-crm-grayText">Pending Queue</span>
                    </div>
                  </div>

                  {/* Microservice logs history list */}
                  <div className="space-y-4">
                    <h5 className="text-sm uppercase font-extrabold text-white tracking-wider">Communication Logs Ledger</h5>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {campLogs.length === 0 ? (
                        <p className="text-xs text-crm-grayText text-center py-6">No individual delivery records found.</p>
                      ) : (
                        campLogs.map(log => (
                          <div
                            key={log.id}
                            className="p-3.5 rounded-xl bg-slate-900/40 border border-crm-border/40 flex items-start justify-between space-x-4 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-100">{log.shopper_name}</span>
                                <span className="text-crm-grayText font-mono text-[10px]">({log.shopper_email})</span>
                              </div>
                              <p className="text-crm-grayText bg-slate-950/40 p-2 rounded text-[11px] font-mono leading-relaxed border border-crm-border/20">
                                {log.message_content}
                              </p>
                              {log.sent_at && (
                                <span className="block text-[9px] text-crm-grayText pt-0.5">
                                  Sent At: {new Date(log.sent_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                            
                            <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded shrink-0 ${
                              log.status === 'DELIVERED' ? 'bg-crm-cyan/10 text-crm-cyan' :
                              log.status === 'READ' ? 'bg-crm-purple/10 text-crm-purple' :
                              log.status === 'FAILED' ? 'bg-crm-red/10 text-crm-red' :
                              'bg-amber-500/10 text-amber-500 animate-pulse'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Campaigns;
