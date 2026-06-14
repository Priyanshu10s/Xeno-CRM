import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, DollarSign, Megaphone, Send, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';

function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalShoppers: 0,
    totalRevenue: 0,
    totalCampaigns: 0,
    totalMessages: 0,
    deliveryStats: { delivered: 0, read: 0, failed: 0, pending: 0, successRate: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [recentCampaigns, setRecentCampaigns] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Execute API telemetry polls in parallel
        const [shoppersRes, ordersRes, campaignsRes, logsRes] = await Promise.all([
          axios.get('/shoppers/'),
          axios.get('/orders/'),
          axios.get('/campaigns/'),
          axios.get('/delivery-logs/')
        ]);

        // Aggregate monetary spend
        const revenueSum = ordersRes.data.reduce((acc, order) => acc + parseFloat(order.amount || 0), 0);

        // Aggregate delivery logs status
        const logs = logsRes.data;
        const totalLogs = logs.length;
        const delivered = logs.filter(l => l.status === 'DELIVERED').count || logs.filter(l => l.status === 'DELIVERED').length;
        const read = logs.filter(l => l.status === 'READ').length;
        const failed = logs.filter(l => l.status === 'FAILED').length;
        const pending = logs.filter(l => l.status === 'PENDING').length;

        const successCount = delivered + read;
        const successRate = totalLogs > 0 ? ((successCount / totalLogs) * 100) : 0;

        setMetrics({
          totalShoppers: shoppersRes.data.length,
          totalRevenue: revenueSum,
          totalCampaigns: campaignsRes.data.length,
          totalMessages: totalLogs,
          deliveryStats: { delivered, read, failed, pending, successRate }
        });

        // Set recent campaigns listing
        setRecentCampaigns(campaignsRes.data.slice(0, 5));
      } catch (err) {
        console.error("Failed to aggregate dashboard telemetry metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crm-indigo"></div>
        <p className="text-sm text-crm-grayText tracking-wide font-medium">Aggregating telemetry logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Core Telemetry Dashboard</h2>
          <p className="text-sm text-crm-grayText mt-1">Real-time CRM execution statistics and microservice logs audit.</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-900/40 border border-crm-border px-4 py-2 rounded-xl text-xs font-mono font-bold text-crm-cyan">
          <Sparkles className="h-4 w-4 animate-spin text-crm-cyan" />
          <span>LIVE TELEMETRY ACTIVE</span>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Shoppers */}
        <div className="bg-crm-card border border-crm-border p-6 rounded-2xl transition-all duration-300 hover:border-crm-indigo/50 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-crm-grayText tracking-wider uppercase">Active Shoppers</span>
              <h3 className="text-3xl font-extrabold text-white">{metrics.totalShoppers}</h3>
            </div>
            <div className="p-3 bg-crm-indigo/10 text-crm-indigo rounded-xl border border-crm-indigo/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center space-x-1 mt-4 text-xs font-medium text-crm-green">
            <TrendingUp className="h-4 w-4" />
            <span>Customer directory populated</span>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-crm-card border border-crm-border p-6 rounded-2xl transition-all duration-300 hover:border-crm-cyan/50 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-crm-grayText tracking-wider uppercase">Ingested Revenue</span>
              <h3 className="text-3xl font-extrabold text-white">${metrics.totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-crm-cyan/10 text-crm-cyan rounded-xl border border-crm-cyan/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center space-x-1 mt-4 text-xs font-medium text-crm-cyan">
            <ArrowUpRight className="h-4 w-4" />
            <span>Aggregated shopper orders</span>
          </div>
        </div>

        {/* Card 3: Campaigns */}
        <div className="bg-crm-card border border-crm-border p-6 rounded-2xl transition-all duration-300 hover:border-crm-purple/50 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-crm-grayText tracking-wider uppercase">Campaigns Built</span>
              <h3 className="text-3xl font-extrabold text-white">{metrics.totalCampaigns}</h3>
            </div>
            <div className="p-3 bg-crm-purple/10 text-crm-purple rounded-xl border border-crm-purple/20">
              <Megaphone className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center space-x-1 mt-4 text-xs font-medium text-crm-purple">
            <Send className="h-4 w-4" />
            <span>Target segments created</span>
          </div>
        </div>

        {/* Card 4: Messages / Success Rate */}
        <div className="bg-crm-card border border-crm-border p-6 rounded-2xl transition-all duration-300 hover:border-crm-green/50 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-crm-grayText tracking-wider uppercase">Delivery Ratio</span>
              <h3 className="text-3xl font-extrabold text-white">{metrics.deliveryStats.successRate.toFixed(1)}%</h3>
            </div>
            <div className="p-3 bg-crm-green/10 text-crm-green rounded-xl border border-crm-green/20">
              <Send className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 mt-4 text-xs text-crm-grayText">
            <span className="text-crm-green font-bold">{metrics.totalMessages}</span>
            <span>total messages dispatched</span>
          </div>
        </div>
      </div>

      {/* Visual Charts & Status logs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Delivery loop ratios chart */}
        <div className="md:col-span-1 bg-crm-card border border-crm-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-bold text-white mb-1">Gateway Statistics</h4>
            <p className="text-xs text-crm-grayText">Microservice dispatch status breakdown.</p>
          </div>

          {/* SVG Progress chart */}
          <div className="flex justify-center items-center py-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                {/* Delivered (Cyan) */}
                <circle
                  cx="50" cy="50" r="40" fill="transparent" stroke="#06B6D4" strokeWidth="8"
                  strokeDasharray={`${251.2 * (metrics.totalMessages > 0 ? (metrics.deliveryStats.delivered / metrics.totalMessages) : 0.75)} 251.2`}
                />
                {/* Read (Purple) */}
                <circle
                  cx="50" cy="50" r="32" fill="transparent" stroke="#A855F7" strokeWidth="8"
                  strokeDasharray={`${201 * (metrics.totalMessages > 0 ? (metrics.deliveryStats.read / metrics.totalMessages) : 0.15)} 201`}
                />
                {/* Failed (Red) */}
                <circle
                  cx="50" cy="50" r="24" fill="transparent" stroke="#EF4444" strokeWidth="8"
                  strokeDasharray={`${150.7 * (metrics.totalMessages > 0 ? (metrics.deliveryStats.failed / metrics.totalMessages) : 0.10)} 150.7`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{metrics.totalMessages}</span>
                <span className="text-[9px] text-crm-grayText uppercase font-bold tracking-wider">Logs</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-crm-cyan" />
                <span className="text-crm-grayText">Delivered</span>
              </div>
              <span className="font-bold text-white">{metrics.deliveryStats.delivered}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-crm-purple" />
                <span className="text-crm-grayText">Read</span>
              </div>
              <span className="font-bold text-white">{metrics.deliveryStats.read}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-crm-red" />
                <span className="text-crm-grayText">Failed</span>
              </div>
              <span className="font-bold text-white">{metrics.deliveryStats.failed}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-crm-grayText">Pending Queue</span>
              </div>
              <span className="font-bold text-white">{metrics.deliveryStats.pending}</span>
            </div>
          </div>
        </div>

        {/* Recent Campaign activities */}
        <div className="md:col-span-2 bg-crm-card border border-crm-border rounded-2xl p-6">
          <h4 className="text-lg font-bold text-white mb-1">Recent Campaign Execution Cycles</h4>
          <p className="text-xs text-crm-grayText mb-6">List of last 5 campaigns enqueued.</p>

          <div className="space-y-4">
            {recentCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-crm-grayText text-sm">
                <p>No campaign execution history found.</p>
              </div>
            ) : (
              recentCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-crm-border/60 hover:bg-slate-900/70 transition-all"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-slate-100 text-sm">{camp.name}</span>
                    <div className="flex items-center space-x-2 text-xs text-crm-grayText">
                      <span>Target: {Object.keys(camp.segment_rules || {}).length} constraints</span>
                      <span>•</span>
                      <span>Created: {new Date(camp.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${
                    camp.status === 'COMPLETED' ? 'bg-crm-green/10 text-crm-green border border-crm-green/20' :
                    camp.status === 'RUNNING' ? 'bg-crm-cyan/10 text-crm-cyan border border-crm-cyan/20 animate-pulse' :
                    camp.status === 'FAILED' ? 'bg-crm-red/10 text-crm-red border border-crm-red/20' :
                    'bg-slate-800 text-crm-grayText border border-slate-700'
                  }`}>
                    {camp.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
