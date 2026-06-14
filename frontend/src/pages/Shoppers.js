import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, UploadCloud, Search, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';

function Shoppers() {
  const [shoppers, setShoppers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Single Shopper Form State
  const [shopperForm, setShopperForm] = useState({ first_name: '', last_name: '', email: '', phone: '', city: '' });
  const [shopperMsg, setShopperMsg] = useState(null);

  // Single Order Form State
  const [orderForm, setOrderForm] = useState({ shopper_email: '', amount: '', purchase_date: '' });
  const [orderMsg, setOrderMsg] = useState(null);

  // Bulk Ingestion states
  const [bulkShopperJson, setBulkShopperJson] = useState('');
  const [bulkOrderJson, setBulkOrderJson] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState(null);

  const fetchShoppers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/shoppers/');
      setShoppers(res.data);
    } catch (err) {
      console.error("Failed to load shoppers list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShoppers();
  }, []);

  // Submit Shopper creation
  const handleShopperSubmit = async (e) => {
    e.preventDefault();
    setShopperMsg(null);
    try {
      await axios.post('/shoppers/', shopperForm);
      setShopperMsg({ type: 'success', text: 'Shopper profile successfully created!' });
      setShopperForm({ first_name: '', last_name: '', email: '', phone: '', city: '' });
      fetchShoppers();
    } catch (err) {
      const errDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setShopperMsg({ type: 'error', text: `Failed: ${errDetail}` });
    }
  };

  // Submit Order Ingestion
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderMsg(null);
    try {
      const payload = {
        shopper_email: orderForm.shopper_email,
        amount: parseFloat(orderForm.amount),
        purchase_date: orderForm.purchase_date || new Date().toISOString()
      };
      await axios.post('/orders/', payload);
      setOrderMsg({ type: 'success', text: `Order of $${payload.amount} logged successfully!` });
      setOrderForm({ shopper_email: '', amount: '', purchase_date: '' });
      fetchShoppers(); // update spend metrics
    } catch (err) {
      const errDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setOrderMsg({ type: 'error', text: `Failed: ${errDetail}` });
    }
  };

  // Bulk Ingest Shoppers
  const handleBulkShoppers = async () => {
    setBulkFeedback(null);
    try {
      const parsed = JSON.parse(bulkShopperJson);
      const res = await axios.post('/shoppers/bulk_ingest/', parsed);
      setBulkFeedback({
        type: 'success',
        text: `Shoppers bulk processed. Success: ${res.data.success_count}, Skipped: ${res.data.skipped_count}`
      });
      setBulkShopperJson('');
      fetchShoppers();
    } catch (err) {
      setBulkFeedback({ type: 'error', text: `Ingestion failed: ${err.message}` });
    }
  };

  // Bulk Ingest Orders
  const handleBulkOrders = async () => {
    setBulkFeedback(null);
    try {
      const parsed = JSON.parse(bulkOrderJson);
      const res = await axios.post('/orders/bulk_ingest/', parsed);
      setBulkFeedback({
        type: 'success',
        text: `Orders bulk processed. Success: ${res.data.success_count}, Skipped: ${res.data.skipped_count}`
      });
      setBulkOrderJson('');
      fetchShoppers();
    } catch (err) {
      setBulkFeedback({ type: 'error', text: `Ingestion failed: ${err.message}` });
    }
  };

  // Filter local listings
  const filteredShoppers = shoppers.filter(sh => {
    const term = searchQuery.toLowerCase();
    return (
      sh.first_name.toLowerCase().includes(term) ||
      sh.last_name.toLowerCase().includes(term) ||
      sh.email.toLowerCase().includes(term) ||
      sh.city.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Shopper Directory</h2>
        <p className="text-sm text-crm-grayText mt-1">Manage customer profiles, search database, and execute transaction logs ingestion.</p>
      </div>

      {/* Main Form Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Form 1: Add Shopper */}
        <div className="bg-crm-card border border-crm-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-crm-indigo" />
            <h4 className="text-base font-bold text-white">Create Shopper Profile</h4>
          </div>
          
          <form onSubmit={handleShopperSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">First Name</label>
              <input
                type="text" required
                value={shopperForm.first_name}
                onChange={e => setShopperForm({...shopperForm, first_name: e.target.value})}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-indigo"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Last Name</label>
              <input
                type="text" required
                value={shopperForm.last_name}
                onChange={e => setShopperForm({...shopperForm, last_name: e.target.value})}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-indigo"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Email</label>
              <input
                type="email" required
                value={shopperForm.email}
                onChange={e => setShopperForm({...shopperForm, email: e.target.value})}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-indigo"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Phone</label>
              <input
                type="text" required
                value={shopperForm.phone}
                onChange={e => setShopperForm({...shopperForm, phone: e.target.value})}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-indigo"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">City</label>
              <input
                type="text" required
                value={shopperForm.city}
                onChange={e => setShopperForm({...shopperForm, city: e.target.value})}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-indigo"
              />
            </div>

            {shopperMsg && (
              <div className={`p-3 rounded-lg flex items-center space-x-2 text-xs ${
                shopperMsg.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/20 text-crm-green' : 'bg-red-950/40 border border-red-500/20 text-crm-red'
              }`}>
                {shopperMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{shopperMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-crm-indigo text-white font-bold rounded-xl transition hover:opacity-90 active:scale-[0.98] text-sm shadow-neon-indigo"
            >
              Save Profile
            </button>
          </form>
        </div>

        {/* Form 2: Ingest Order */}
        <div className="bg-crm-card border border-crm-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <UploadCloud className="h-5 w-5 text-crm-cyan" />
            <h4 className="text-base font-bold text-white">Ingest Order Transaction</h4>
          </div>

          <form onSubmit={handleOrderSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Shopper Email</label>
              <input
                type="email" required
                placeholder="e.g. shopper@example.com"
                value={orderForm.shopper_email}
                onChange={e => setOrderForm({...orderForm, shopper_email: e.target.value})}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-cyan"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Order Amount ($)</label>
              <input
                type="number" step="0.01" required
                value={orderForm.amount}
                onChange={e => setOrderForm({...orderForm, amount: e.target.value})}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-cyan"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Purchase Date (Optional)</label>
              <input
                type="datetime-local"
                value={orderForm.purchase_date}
                onChange={e => setOrderForm({...orderForm, purchase_date: e.target.value})}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-crm-cyan"
              />
            </div>

            {orderMsg && (
              <div className={`p-3 rounded-lg flex items-center space-x-2 text-xs ${
                orderMsg.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/20 text-crm-green' : 'bg-red-950/40 border border-red-500/20 text-crm-red'
              }`}>
                {orderMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{orderMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-crm-cyan text-slate-950 font-bold rounded-xl transition hover:opacity-90 active:scale-[0.98] text-sm shadow-neon-cyan"
            >
              Log Order
            </button>
          </form>
        </div>

        {/* Form 3: Bulk JSON Ingestion */}
        <div className="bg-crm-card border border-crm-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center space-x-2">
            <UploadCloud className="h-5 w-5 text-crm-purple" />
            <h4 className="text-base font-bold text-white">Bulk Data Utility</h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Bulk Shoppers JSON</label>
              <textarea
                rows="3"
                placeholder='[{"first_name":"Jane","last_name":"Doe","email":"jane@example.com","phone":"12345","city":"Delhi"}]'
                value={bulkShopperJson}
                onChange={e => setBulkShopperJson(e.target.value)}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-crm-purple"
              />
              <button
                onClick={handleBulkShoppers}
                className="w-full mt-1.5 py-2 bg-crm-purple/20 text-crm-purple border border-crm-purple/30 font-bold rounded-lg transition hover:bg-crm-purple/35 text-xs"
              >
                Execute Bulk Shoppers Ingestion
              </button>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-crm-grayText mb-1">Bulk Orders JSON</label>
              <textarea
                rows="3"
                placeholder='[{"shopper_email":"jane@example.com","amount":250.00}]'
                value={bulkOrderJson}
                onChange={e => setBulkOrderJson(e.target.value)}
                className="w-full bg-slate-900 border border-crm-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-crm-purple"
              />
              <button
                onClick={handleBulkOrders}
                className="w-full mt-1.5 py-2 bg-crm-purple/20 text-crm-purple border border-crm-purple/30 font-bold rounded-lg transition hover:bg-crm-purple/35 text-xs"
              >
                Execute Bulk Orders Ingestion
              </button>
            </div>
          </div>

          {bulkFeedback && (
            <div className={`p-3 rounded-lg flex items-center space-x-2 text-xs ${
              bulkFeedback.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/20 text-crm-green' : 'bg-red-950/40 border border-red-500/20 text-crm-red'
            }`}>
              {bulkFeedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{bulkFeedback.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Shopper List Table */}
      <div className="bg-crm-card border border-crm-border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
          <div>
            <h4 className="text-lg font-bold text-white">Populated Shoppers List</h4>
            <p className="text-xs text-crm-grayText">Active shoppers with annotated spend aggregates.</p>
          </div>
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-crm-grayText">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search shoppers name, email, city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-crm-border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-crm-indigo"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-crm-border text-[10px] uppercase font-extrabold tracking-wider text-crm-grayText">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Total Purchases</th>
                <th className="py-3 px-4">Monetary Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crm-border/60 text-sm">
              {filteredShoppers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-crm-grayText">
                    {loading ? 'Fetching database records...' : 'No matching shoppers found.'}
                  </td>
                </tr>
              ) : (
                filteredShoppers.map(sh => (
                  <tr key={sh.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white">{sh.first_name} {sh.last_name}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-200">{sh.email}</span>
                        <span className="text-[10px] text-crm-grayText">{sh.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{sh.city}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-crm-purple">{sh.order_count || 0}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-crm-cyan">${parseFloat(sh.total_spend || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Shoppers;
