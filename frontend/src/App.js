import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Configure defaults for backend connectivity
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ==========================================
// STATIC PROFILE DATA FOR OFFLINE MESH
// ==========================================
const SHIELD_CONSUMERS = [
  { id: '8a9c3d4f-127b-468e-920f-cb919283f0f1', first_name: 'Priya', last_name: 'Sharma', email: 'priya@example.com', phone: '+91 98765 43210', city: 'Delhi', total_spend: 12500, order_count: 5 },
  { id: '3f0b9c1d-8e4a-4c2b-9d3f-5a6b7c8d9e0f', first_name: 'Rohan', last_name: 'Verma', email: 'rohan@example.com', phone: '+91 99999 88888', city: 'Delhi', total_spend: 4500, order_count: 2 },
  { id: '7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f', first_name: 'Amit', last_name: 'Patel', email: 'amit@example.com', phone: '+91 91234 56789', city: 'Mumbai', total_spend: 22000, order_count: 8 },
  { id: '1b2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', first_name: 'Sneha', last_name: 'Reddy', email: 'sneha@example.com', phone: '+91 95555 44444', city: 'Bangalore', total_spend: 8500, order_count: 4 },
  { id: '5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c', first_name: 'Vikram', last_name: 'Singh', email: 'vikram@example.com', phone: '+91 96666 77777', city: 'Delhi', total_spend: 16000, order_count: 6 }
];

export default function App() {
  // Global Navigation & Health
  const [activeTab, setActiveTab] = useState('ingestion'); // ingestion, orchestration, telemetry
  const [apiOnline, setApiOnline] = useState(null);

  // Ingestion Workspace
  const [shoppers, setShoppers] = useState(SHIELD_CONSUMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Auto-typing placeholder suggestion text loop
  const suggestions = [
    "Find high-spending customers in Delhi...",
    "Delhi VIP customers with total spend > 5000...",
    "Show recent buyers with order count >= 3...",
    "Active buyers from Mumbai..."
  ];
  const [typedPlaceholder, setTypedPlaceholder] = useState("");

  // Forms State
  const [shopperForm, setShopperForm] = useState({ first_name: '', last_name: '', email: '', phone: '', city: '' });
  const [orderForm, setOrderForm] = useState({ shopper_email: '', amount: '', purchase_date: '', product_name: '' });
  const [bulkShoppersText, setBulkShoppersText] = useState('');
  const [bulkOrdersText, setBulkOrdersText] = useState('');

  // Drawer Layout States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerFormType, setDrawerFormType] = useState('single'); // 'single' | 'transaction' | 'bulk'

  // Orchestration Workspace
  const [activeChannel, setActiveChannel] = useState('whatsapp'); // whatsapp, sms, email, rcs
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('Hi [first_name], enjoy a special discount in [city]!');
  const [emailSubject, setEmailSubject] = useState('Exclusive VIP Lounge Access');
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiTone, setAiTone] = useState('VIP');
  const [aiProduct, setAiProduct] = useState('Classic Watches');
  const [generatingAiCopy, setGeneratingAiCopy] = useState(false);
  const [aiCopyOptions, setAiCopyOptions] = useState([]);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // Telemetry Insights
  const [metrics, setMetrics] = useState({
    dispatched: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    pending: 0,
    revenue: 0
  });
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [lineGraphData, setLineGraphData] = useState([30, 45, 38, 65, 52, 78, 70, 85, 75, 95]);
  const logTerminalEndRef = useRef(null);

  // Log message helper
  const postConsoleLog = (message, status = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev.slice(-38), { timestamp, message, status }]);
  };

  // 1. Server Anti-Sleep Protection Loop and Health check
  useEffect(() => {
    const runHealthCheck = async () => {
      try {
        await axios.get('/health/');
        setApiOnline(true);
        postConsoleLog("[HEALTH_CHECK] Connection established with backend API node.", "success");
      } catch (err) {
        setApiOnline(false);
        postConsoleLog("[HEALTH_CHECK] Backend offline. Initialized local sandbox fallback loop.", "warning");
      }
    };
    runHealthCheck();
  }, []);

  // 2. Load Shoppers from API
  const pullShoppers = async () => {
    try {
      const res = await axios.get('/shoppers/');
      setShoppers(res.data.length > 0 ? res.data : SHIELD_CONSUMERS);
      setApiOnline(true);
    } catch (err) {
      setApiOnline(false);
    }
  };

  useEffect(() => {
    pullShoppers();
    const syncInterval = setInterval(pullShoppers, 12000);
    return () => clearInterval(syncInterval);
  }, []);

  // 3. Typewriter placeholder loop
  useEffect(() => {
    let currentIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer;

    const animateText = () => {
      const fullWord = suggestions[currentIdx];
      if (!deleting) {
        setTypedPlaceholder(fullWord.substring(0, charIdx + 1));
        charIdx++;
        if (charIdx === fullWord.length) {
          deleting = true;
          timer = setTimeout(animateText, 2500);
        } else {
          timer = setTimeout(animateText, 60);
        }
      } else {
        setTypedPlaceholder(fullWord.substring(0, charIdx - 1));
        charIdx--;
        if (charIdx === 0) {
          deleting = false;
          currentIdx = (currentIdx + 1) % suggestions.length;
          timer = setTimeout(animateText, 400);
        } else {
          timer = setTimeout(animateText, 30);
        }
      }
    };

    animateText();
    return () => clearTimeout(timer);
  }, []);

  // 4. Telemetry Tick Simulation
  useEffect(() => {
    const telemetryTimer = setInterval(() => {
      // Stream coordinates updates for line graph
      setLineGraphData(prev => {
        const nextVal = Math.max(15, Math.min(100, prev[prev.length - 1] + (Math.random() * 24 - 12)));
        return [...prev.slice(1), nextVal];
      });

      // Update campaign metric distributions
      setMetrics(prev => {
        if (prev.pending > 0) {
          const step = Math.min(prev.pending, Math.ceil(Math.random() * 4));
          let resolvedDelivered = 0;
          let resolvedRead = 0;
          let resolvedFailed = 0;

          for (let i = 0; i < step; i++) {
            const roll = Math.random();
            if (roll < 0.75) resolvedDelivered++;
            else if (roll < 0.90) resolvedRead++;
            else resolvedFailed++;
          }

          if (resolvedDelivered > 0) postConsoleLog(`[CELERY_TASK] Dispatched ${resolvedDelivered} messages. Status: DELIVERED`, "success");
          if (resolvedRead > 0) postConsoleLog(`[CRM_WEBHOOK] Pessimistic lock acquired. Webhook parsed READ status for ${resolvedRead} shoppers.`, "info");
          if (resolvedFailed > 0) postConsoleLog(`[CHANNEL_STUB] Carrier reported delivery drop for ${resolvedFailed} payloads. Status: FAILED`, "error");

          const remaining = prev.pending - step;
          if (remaining === 0) {
            postConsoleLog("[CAMPAIGN_MANAGER] All outbound messages resolved. Status: COMPLETED", "success");
          }

          return {
            ...prev,
            pending: remaining,
            delivered: prev.delivered + resolvedDelivered,
            read: prev.read + resolvedRead,
            failed: prev.failed + resolvedFailed,
            revenue: prev.revenue + (resolvedRead * (Math.random() * 600 + 400))
          };
        }
        return prev;
      });
    }, 2800);

    return () => clearInterval(telemetryTimer);
  }, []);

  // Scroll console
  useEffect(() => {
    if (logTerminalEndRef.current) {
      logTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  // Dynamic filter mappings
  const getFilteredShoppers = () => {
    return shoppers.filter(sh => {
      const matchText = searchQuery.trim()
        ? sh.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sh.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sh.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sh.city.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchBadges = activeFilters.every(badge => {
        if (badge.key === 'city__iexact') return sh.city.toLowerCase() === badge.value.toLowerCase();
        if (badge.key === 'total_spend__gte') return parseFloat(sh.total_spend) >= parseFloat(badge.value);
        if (badge.key === 'order_count__gte') return parseInt(sh.order_count) >= parseInt(badge.value);
        return true;
      });

      return matchText && matchBadges;
    });
  };

  const filteredShoppers = getFilteredShoppers();

  // Ingest search filter tags via AI query compiler
  const handleAiSearchCompile = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoadingSearch(true);
    setFeedback(null);
    postConsoleLog(`[NLP_COMPILER] Compiling semantic query: "${searchQuery}"`);

    // Force 1.5s Shimmer grid Row block
    setTimeout(async () => {
      if (apiOnline) {
        try {
          const res = await axios.post('/campaigns/nlp_segment/', { query: searchQuery });
          if (res.data.error) {
            setFeedback({ type: 'error', text: `AI Compilation error: ${res.data.error}` });
            postConsoleLog(`[NLP_COMPILER] Compilation error: ${res.data.error}`, "error");
          } else {
            setFeedback({ type: 'success', text: `AI Filters Compiled: ${res.data.explanation}` });
            postConsoleLog(`[NLP_COMPILER] Segment rules resolved: ${res.data.explanation}`, "success");

            const raw = res.data.filters || {};
            const newBadges = [];
            if (raw.city__iexact) newBadges.push({ id: 'city', label: `City: ${raw.city__iexact}`, key: 'city__iexact', value: raw.city__iexact });
            if (raw.total_spend__gte) newBadges.push({ id: 'spend', label: `Spend >= ₹${raw.total_spend__gte}`, key: 'total_spend__gte', value: raw.total_spend__gte });
            if (raw.order_count__gte) newBadges.push({ id: 'orders', label: `Orders >= ${raw.order_count__gte}`, key: 'order_count__gte', value: raw.order_count__gte });
            setActiveFilters(newBadges);
          }
        } catch (err) {
          setFeedback({ type: 'error', text: `API network exception: ${err.message}` });
        } finally {
          setIsLoadingSearch(false);
        }
      } else {
        // Fallback offline keywords parsing
        const queryLower = searchQuery.toLowerCase();
        const localTags = [];
        let desc = "";

        if (queryLower.includes('delhi')) {
          localTags.push({ id: 'city', label: 'City: Delhi', key: 'city__iexact', value: 'Delhi' });
          desc += "City equals Delhi. ";
        } else if (queryLower.includes('mumbai')) {
          localTags.push({ id: 'city', label: 'City: Mumbai', key: 'city__iexact', value: 'Mumbai' });
          desc += "City equals Mumbai. ";
        }

        if (queryLower.includes('5000') || queryLower.includes('vip')) {
          localTags.push({ id: 'spend', label: 'Spend >= ₹5,000', key: 'total_spend__gte', value: 5000 });
          desc += "Spend >= ₹5,000. ";
        } else if (queryLower.includes('1000')) {
          localTags.push({ id: 'spend', label: 'Spend >= ₹1,000', key: 'total_spend__gte', value: 1000 });
          desc += "Spend >= ₹1,000. ";
        }

        if (localTags.length > 0) {
          setActiveFilters(localTags);
          setFeedback({ type: 'success', text: `Offline parsed constraints: ${desc}` });
          postConsoleLog(`[NLP_COMPILER] Local rule parsing success: ${desc}`, "success");
        } else {
          setFeedback({ type: 'error', text: "Could not compile segment query rules locally." });
          postConsoleLog("[NLP_COMPILER] Local parsing failed to resolve search criteria.", "error");
        }
        setIsLoadingSearch(false);
      }
    }, 1500);
  };

  // Single Ingestion handlers
  const handleShopperSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (apiOnline) {
        const res = await axios.post('/shoppers/', shopperForm);
        setShoppers(prev => [res.data, ...prev]);
      } else {
        const mockRow = { id: Math.random().toString(), ...shopperForm, total_spend: 0, order_count: 0 };
        setShoppers(prev => [mockRow, ...prev]);
      }
      setFeedback({ type: 'success', text: 'Shopper profile successfully ingested!' });
      postConsoleLog(`[DATA_INGEST] Ingested shopper profile: ${shopperForm.first_name} ${shopperForm.last_name}`);
      setShopperForm({ first_name: '', last_name: '', email: '', phone: '', city: '' });
      setIsDrawerOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to ingest shopper.' });
    }
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (apiOnline) {
        await axios.post('/orders/', {
          shopper_email: orderForm.shopper_email,
          amount: parseFloat(orderForm.amount),
          purchase_date: orderForm.purchase_date || new Date().toISOString()
        });
        pullShoppers();
      } else {
        setShoppers(prev =>
          prev.map(sh =>
            sh.email.toLowerCase() === orderForm.shopper_email.toLowerCase()
              ? { ...sh, total_spend: parseFloat(sh.total_spend) + parseFloat(orderForm.amount), order_count: sh.order_count + 1 }
              : sh
          )
        );
      }
      setFeedback({ type: 'success', text: `Log order successful of ₹${orderForm.amount}!` });
      postConsoleLog(`[DATA_INGEST] Ingested transaction order: ₹${orderForm.amount} for email: ${orderForm.shopper_email}`);
      setOrderForm({ shopper_email: '', amount: '', purchase_date: '', product_name: '' });
      setIsDrawerOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to ingest order.' });
    }
  };

  // Bulk processing
  const handleBulkShoppers = async () => {
    setFeedback(null);
    try {
      const parsed = JSON.parse(bulkShoppersText);
      if (apiOnline) {
        await axios.post('/shoppers/bulk_ingest/', parsed);
        pullShoppers();
      } else {
        const added = parsed.map(item => ({ id: Math.random().toString(), total_spend: 0, order_count: 0, ...item }));
        setShoppers(prev => [...added, ...prev]);
      }
      setFeedback({ type: 'success', text: `Processed ${parsed.length} shoppers batch.` });
      postConsoleLog(`[DATA_INGEST] Processed bulk shoppers: ${parsed.length} rows.`);
      setBulkShoppersText('');
      setIsDrawerOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', text: `JSON format error: ${err.message}` });
    }
  };

  const handleBulkOrders = async () => {
    setFeedback(null);
    try {
      const parsed = JSON.parse(bulkOrdersText);
      if (apiOnline) {
        await axios.post('/orders/bulk_ingest/', parsed);
        pullShoppers();
      } else {
        setShoppers(prev =>
          prev.map(sh => {
            const matches = parsed.filter(o => o.shopper_email.toLowerCase() === sh.email.toLowerCase());
            if (matches.length > 0) {
              const addedSpend = matches.reduce((acc, m) => acc + parseFloat(m.amount), 0);
              return { ...sh, total_spend: parseFloat(sh.total_spend) + addedSpend, order_count: sh.order_count + matches.length };
            }
            return sh;
          })
        );
      }
      setFeedback({ type: 'success', text: `Processed ${parsed.length} orders batch.` });
      postConsoleLog(`[DATA_INGEST] Processed bulk orders: ${parsed.length} rows.`);
      setBulkOrdersText('');
      setIsDrawerOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', text: `JSON format error: ${err.message}` });
    }
  };

  // AI copywriting generator
  const runAiCopywriter = async () => {
    setGeneratingAiCopy(true);
    setAiCopyOptions([]);
    
    const payload = {
      tone: aiTone,
      product_category: aiProduct
    };

    if (apiOnline) {
      try {
        const res = await axios.post('/campaigns/generate_copy/', payload);
        setAiCopyOptions(res.data.variations || []);
        postConsoleLog(`[COPY_AGENT] Generated ${res.data.variations?.length} templates from OpenAI.`);
      } catch (err) {
        postConsoleLog("[COPY_AGENT] Connection unavailable. Loading local fallback templates.", "warning");
        setAiCopyOptions(_getFallbackTemplates(payload.product_category, payload.tone));
      } finally {
        setGeneratingAiCopy(false);
      }
    } else {
      setTimeout(() => {
        setAiCopyOptions(_getFallbackTemplates(payload.product_category, payload.tone));
        setGeneratingAiCopy(false);
        postConsoleLog("[COPY_AGENT] Generated simulated templates.");
      }, 1000);
    }
  };

  const _getFallbackTemplates = (prod, tone) => {
    if (tone === 'VIP') {
      return [
        `Hi [first_name], as one of our top customers in [city], enjoy early access to the new ${prod} collection!`,
        `Hello [first_name], thank you for shopping. Explore special concierge benefits in [city] on your next ${prod} purchase.`
      ];
    }
    return [
      `Hey [first_name]! We miss you. Get 15% off your next ${prod} order in [city] with code: COMEBACK15`,
      `Don't miss out [first_name]! Special discount active in [city] today only. Click here.`
    ];
  };

  // Launch campaign handler
  const handleLaunchCampaign = async () => {
    setShowLaunchModal(false);
    setIsLaunching(true);
    postConsoleLog(`[LAUNCHER] Queueing campaign dispatch loop for ${filteredShoppers.length} shoppers...`);

    if (apiOnline) {
      try {
        const rulesPayload = {};
        activeFilters.forEach(f => {
          if (f.key === 'city__iexact') rulesPayload.city = f.value;
          if (f.key === 'total_spend__gte') rulesPayload.min_spend = parseFloat(f.value);
          if (f.key === 'order_count__gte') rulesPayload.min_orders = parseInt(f.value);
        });

        const campRes = await axios.post('/campaigns/', {
          name: campaignName || `Camp_${Date.now()}`,
          message_template: messageTemplate,
          segment_rules: rulesPayload
        });

        await axios.post(`/campaigns/${campRes.data.id}/send/`);
        postConsoleLog(`[LAUNCHER] Asynchronous message queue tasks activated. Campaign ID: ${campRes.data.id}`, "success");
        
        setMetrics(prev => ({
          ...prev,
          dispatched: prev.dispatched + filteredShoppers.length,
          pending: prev.pending + filteredShoppers.length
        }));
        
        setActiveTab('telemetry');
      } catch (err) {
        postConsoleLog(`[LAUNCHER] Execution failure: ${err.message}`, "error");
      } finally {
        setIsLaunching(false);
      }
    } else {
      setTimeout(() => {
        setMetrics(prev => ({
          ...prev,
          dispatched: prev.dispatched + filteredShoppers.length,
          pending: prev.pending + filteredShoppers.length
        }));
        setIsLaunching(false);
        postConsoleLog("[LAUNCHER] Simulated campaign launched successfully.", "success");
        setActiveTab('telemetry');
      }, 1500);
    }
  };

  const getSmartphonePreview = () => {
    return messageTemplate
      .replace(/\[first_name\]/g, 'Priya')
      .replace(/\[last_name\]/g, 'Sharma')
      .replace(/\[city\]/g, 'Delhi')
      .replace(/\[email\]/g, 'priya@example.com');
  };

  // SVG Line Chart Coords
  const getSvgPolylinePoints = () => {
    return lineGraphData.map((val, idx) => {
      const x = 15 + (idx / (lineGraphData.length - 1)) * 270;
      const y = 90 - (val / 100) * 80;
      return `${x},${y}`;
    }).join(' ');
  };

  const getSvgFillPath = () => {
    const coords = lineGraphData.map((val, idx) => {
      const x = 15 + (idx / (lineGraphData.length - 1)) * 270;
      const y = 90 - (val / 100) * 80;
      return `${x},${y}`;
    });
    return `M15,90 ` + coords.map(c => `L${c}`).join(' ') + ` L285,90 Z`;
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 antialiased selection:bg-purple-500/30 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Dynamic Style Injection for Hardware-Level Rotations & Glowing Effects */}
      <style>{`
        @keyframes xeno-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes xeno-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes xeno-pulse-glow {
          0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 3px #00F2FE); }
          50% { opacity: 1; filter: drop-shadow(0 0 12px #00F2FE); }
        }
        @keyframes xeno-pulse-node {
          0%, 100% { opacity: 0.7; transform: scale(0.95); filter: drop-shadow(0 0 2px #10B981); }
          50% { opacity: 1; transform: scale(1.05); filter: drop-shadow(0 0 8px #10B981); }
        }
        .xeno-spin-slow {
          animation: xeno-spin 25s linear infinite;
          transform-origin: center;
        }
        .xeno-spin-slow-reverse {
          animation: xeno-spin-reverse 18s linear infinite;
          transform-origin: center;
        }
        .xeno-glow-pulse {
          animation: xeno-pulse-glow 3s ease-in-out infinite;
        }
        .xeno-node-pulse {
          animation: xeno-pulse-node 2s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      {/* Background ambient light radial halos */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[250px] bg-emerald-950/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Global Header */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/85 backdrop-blur-md border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
        <div className="inline-flex items-center space-x-4">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00F2FE] to-[#4FACFE] rounded-xl blur-md opacity-35 animate-pulse" />
            <div className="relative p-2 bg-[#0B0F19]/90 border border-white/10 rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.18)] flex items-center justify-center">
              <svg className="w-9 h-9" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-electric-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F2FE" />
                    <stop offset="100%" stopColor="#4FACFE" />
                  </linearGradient>
                </defs>
                {/* Outer spinning grid matrix */}
                <g className="xeno-spin-slow">
                  <polygon points="50,8 80,20 92,50 80,80 50,92 20,80 8,50 20,20" stroke="url(#logo-electric-grad)" strokeWidth="1" strokeOpacity="0.4" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="url(#logo-electric-grad)" strokeWidth="1" strokeDasharray="3 6" strokeOpacity="0.6" fill="none" />
                </g>
                {/* Inner reverse spin matrix */}
                <g className="xeno-spin-slow-reverse">
                  <rect x="26" y="26" width="48" height="48" rx="3" stroke="url(#logo-electric-grad)" strokeWidth="1.2" fill="none" strokeDasharray="8 4" strokeOpacity="0.8" />
                </g>
                {/* Center Core node & dual interconnected path symmetry */}
                <g className="xeno-glow-pulse">
                  <path d="M36,36 L64,64 M36,64 L64,36" stroke="url(#logo-electric-grad)" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M50,28 L65,50 L50,72 L35,50 Z" stroke="url(#logo-electric-grad)" strokeWidth="1.5" fill="none" />
                  <circle cx="50" cy="50" r="5" fill="url(#logo-electric-grad)" />
                </g>
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-white via-slate-100 to-[#00F2FE] bg-clip-text text-transparent uppercase font-sans">
                XENO CRM
              </span>
              <span className="text-[8px] font-mono font-extrabold bg-[#00F2FE]/15 text-[#00F2FE] border border-[#00F2FE]/30 px-1.5 py-0.5 rounded uppercase tracking-widest scale-90">
                v2.1
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
              CONTROL CENTER // INGESTION_MESH
            </p>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex p-1 bg-slate-950/70 border border-white/[0.08] rounded-xl space-x-1">
          <button
            onClick={() => {
              setActiveTab('ingestion');
              postConsoleLog("[NAVIGATION] Switched tab matrix to Live Audiences.");
            }}
            className={`flex items-center space-x-2 px-4.5 py-2.5 text-xs font-extrabold rounded-lg transition-all duration-300 border ${
              activeTab === 'ingestion'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-white/15 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.02]'
            }`}
          >
            <svg className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'ingestion' ? 'scale-110 text-purple-300' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <span>Live Audiences</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('orchestration');
              postConsoleLog("[NAVIGATION] Switched tab matrix to Campaign Studio.");
            }}
            className={`flex items-center space-x-2 px-4.5 py-2.5 text-xs font-extrabold rounded-lg transition-all duration-300 border ${
              activeTab === 'orchestration'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-white/15 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.02]'
            }`}
          >
            <svg className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'orchestration' ? 'scale-110 text-emerald-300 animate-pulse' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 3v4M3 5h4M6 17v4M4 19h4m14-9h-4m2-2v4m-8-7l-1 2-2 1 2 1 1 2 1-2 2-1-2-1zm5 10l-1 2-2 1 2 1 1 2 1-2 2-1-2-1z" />
            </svg>
            <span>Campaign Studio</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('telemetry');
              postConsoleLog("[NAVIGATION] Switched tab matrix to Telemetry Insights.");
            }}
            className={`flex items-center space-x-2 px-4.5 py-2.5 text-xs font-extrabold rounded-lg transition-all duration-300 border ${
              activeTab === 'telemetry'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-white/15 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.02]'
            }`}
          >
            <svg className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'telemetry' ? 'scale-110 text-purple-300' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Telemetry Insights</span>
          </button>
        </div>

        {/* API Health State Indicator */}
        <div className="flex items-center space-x-3 bg-slate-950/60 border border-white/[0.06] rounded-xl px-3.5 py-2 text-[10px] font-mono">
          <span className="text-slate-400 uppercase">Gateway Node</span>
          <span className={`h-2 w-2 rounded-full ${
            apiOnline === true ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' :
            apiOnline === false ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-ping' :
            'bg-amber-400 animate-pulse'
          }`} />
        </div>
      </header>

      {/* Main Panel Content Viewport */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
        
        {/* ==========================================
            WORKSPACE 1: LIVE AUDIENCES & INGESTION
           ========================================== */}
        {activeTab === 'ingestion' && (
          <div className="w-full mx-auto max-w-7xl space-y-6 animate-fade-in">
            
            {/* Global search & AI Schema Filter Compiler */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/[0.05] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-white">AI Schema Filter Compiler</h4>
                <span className="text-[9px] text-slate-400 font-mono">June 2026 Reference Date</span>
              </div>

              <form onSubmit={handleAiSearchCompile} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  {/* Search SVG */}
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <input
                  type="text"
                  placeholder={typedPlaceholder || "Type natural language filter prompt..."}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.08] focus:border-purple-500 rounded-xl pl-10 pr-28 py-3 text-xs text-white focus:outline-none transition shadow-[0_0_15px_rgba(139,92,246,0.02)]"
                />

                <button
                  type="submit"
                  className="absolute inset-y-1.5 right-1.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-[10px] font-bold text-white flex items-center space-x-1.5 hover:opacity-90 transition"
                >
                  {/* Sparkle SVG */}
                  <svg className="w-3 h-3 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 3v4M3 5h4M6 17v4M4 19h4m14-9h-4m2-2v4" />
                  </svg>
                  <span>Compile Segment</span>
                </button>
              </form>

              {/* Constraint Badges */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 mr-1">Active Filters:</span>
                  {activeFilters.map(badge => (
                    <span
                      key={badge.id}
                      className="flex items-center space-x-1 bg-slate-950 border border-white/[0.05] px-2 py-0.5 rounded text-[10px]"
                    >
                      <span className="text-slate-300 font-mono">{badge.label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilters(prev => prev.filter(f => f.id !== badge.id));
                          postConsoleLog(`[FILTER_ENGINE] Cleared filter condition: ${badge.id}`);
                        }}
                        className="text-red-500 hover:text-red-400 font-bold"
                      >
                        ✖
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => { setActiveFilters([]); postConsoleLog("[FILTER_ENGINE] Flushed all filter criteria tags."); }}
                    className="text-[9px] text-red-400 hover:underline font-bold ml-2"
                  >
                    Reset Filter
                  </button>
                </div>
              )}

              {feedback && (
                <div className={`p-3 rounded-xl text-[10px] leading-relaxed flex items-center space-x-2 border ${
                  feedback.type === 'success' ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-red-950/20 border-red-500/20 text-red-400'
                }`}>
                  <span>{feedback.text}</span>
                </div>
              )}
            </div>

            {/* Shoppers Data Grid */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/[0.05] rounded-2xl p-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <h4 className="text-sm font-extrabold text-white">Shoppers Index</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Database audit tables displaying lifetime values.</p>
                </div>
                
                {/* Command Action Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded sm:mr-2">
                    {filteredShoppers.length} records matched
                  </span>
                  
                  {/* Action Buttons */}
                  <button
                    onClick={() => { setDrawerFormType('single'); setIsDrawerOpen(true); }}
                    className="px-3 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/35 rounded-xl font-bold transition text-[10px] flex items-center space-x-1"
                  >
                    <span>➕ Add Shopper</span>
                  </button>
                  <button
                    onClick={() => { setDrawerFormType('transaction'); setIsDrawerOpen(true); }}
                    className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 rounded-xl font-bold transition text-[10px] flex items-center space-x-1"
                  >
                    <span>💸 Log Order</span>
                  </button>
                  <button
                    onClick={() => { setDrawerFormType('bulk'); setIsDrawerOpen(true); }}
                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/25 hover:bg-blue-500/20 rounded-xl font-bold transition text-[10px] flex items-center space-x-1"
                  >
                    <span>📥 Bulk Ingest</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[8px] uppercase tracking-wider font-extrabold text-slate-400">
                      <th className="py-3 px-4">Shopper UUID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4 text-right">Orders</th>
                      <th className="py-3 px-4 text-right">Lifetime Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-[11px] text-slate-300">
                    {isLoadingSearch ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="py-4 px-4"><div className="h-2 bg-slate-800 rounded w-16" /></td>
                          <td className="py-4 px-4 flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-slate-800" />
                            <div className="h-2.5 bg-slate-800 rounded w-16" />
                          </td>
                          <td className="py-4 px-4"><div className="h-2 bg-slate-800 rounded w-32" /></td>
                          <td className="py-4 px-4"><div className="h-2 bg-slate-800 rounded w-10" /></td>
                          <td className="py-4 px-4"><div className="h-2.5 bg-slate-800 rounded w-4 ml-auto" /></td>
                          <td className="py-4 px-4"><div className="h-2.5 bg-slate-800 rounded w-12 ml-auto" /></td>
                        </tr>
                      ))
                    ) : filteredShoppers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          {/* Alert Triangle SVG */}
                          <svg className="w-8 h-8 mx-auto text-slate-600 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-xs">No records matching query parameters found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredShoppers.map(sh => (
                        <tr key={sh.id} className="hover:bg-white/[0.02] transition duration-150">
                          <td className="py-3.5 px-4 font-mono text-[9px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]" title={sh.id}>
                            {sh.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 text-purple-300 font-extrabold flex items-center justify-center text-[10px] border border-purple-500/30 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                                {sh.first_name ? sh.first_name[0] : ''}{sh.last_name ? sh.last_name[0] : ''}
                              </div>
                              <span className="font-semibold text-slate-100">{sh.first_name} {sh.last_name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">{sh.email}</td>
                          <td className="py-3.5 px-4">{sh.city}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-400">{sh.order_count}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 flex items-center justify-end space-x-1">
                            <span>
                              {new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                                maximumFractionDigits: 0
                              }).format(sh.total_spend)}
                            </span>
                            {parseFloat(sh.total_spend) >= 10000 && (
                              <span className="inline-block text-[9px] text-emerald-400 animate-pulse font-bold">▲</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            WORKSPACE 2: CAMPAIGN ORCHESTRATION STUDIO
           ========================================== */}
        {activeTab === 'orchestration' && (
          <div className="space-y-8 animate-fade-in">
            {/* Omnichannel Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: 'whatsapp', name: 'WhatsApp', desc: 'Emerald Inbound', activeColor: 'border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)] text-[#10B981]', inactiveColor: 'border-white/[0.05] hover:border-[#10B981]/40 text-slate-400' },
                { id: 'sms', name: 'SMS Gateway', desc: 'Indigo Outbound', activeColor: 'border-[#6366F1] shadow-[0_0_15px_rgba(99,102,241,0.15)] text-[#6366F1]', inactiveColor: 'border-white/[0.05] hover:border-[#6366F1]/40 text-slate-400' },
                { id: 'email', name: 'Email Server', desc: 'Sky Blue SMTP', activeColor: 'border-[#0EA5E9] shadow-[0_0_15px_rgba(14,165,233,0.15)] text-[#0EA5E9]', inactiveColor: 'border-white/[0.05] hover:border-[#0EA5E9]/40 text-slate-400' },
                { id: 'rcs', name: 'RCS Delivery', desc: 'Amber Messaging', activeColor: 'border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.15)] text-[#F59E0B]', inactiveColor: 'border-white/[0.05] hover:border-[#F59E0B]/40 text-slate-400' }
              ].map(ch => {
                const isActive = activeChannel === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      setActiveChannel(ch.id);
                      postConsoleLog(`[CHANNEL_ORCHESTRATOR] Shifted outbound channel matrix to: ${ch.name}`);
                    }}
                    className={`cursor-pointer p-4.5 rounded-2xl border transition-all duration-300 transform active:scale-95 flex items-center space-x-3.5 bg-slate-900/40 backdrop-blur-md ${
                      isActive ? ch.activeColor : ch.inactiveColor
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                      isActive ? 'bg-slate-950/80 border border-white/10' : 'bg-slate-950 border border-white/[0.05]'
                    }`}>
                      {ch.id === 'whatsapp' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="wa-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#10B981" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                          </defs>
                          <circle cx="12" cy="12" r="9" stroke="url(#wa-grad)" strokeWidth="1.5" fill="none" />
                          <circle cx="12" cy="12" r="5" stroke="url(#wa-grad)" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="url(#wa-grad)" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="12" cy="12" r="2.5" fill="url(#wa-grad)" />
                        </svg>
                      )}
                      {ch.id === 'sms' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="sms-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#6366F1" />
                              <stop offset="100%" stopColor="#4F46E5" />
                            </linearGradient>
                          </defs>
                          <path d="M2 12h20M2 6h20M2 18h20" stroke="url(#sms-grad)" strokeWidth="0.5" strokeOpacity="0.3" />
                          <path d="M6 2v20M12 2v20M18 2v20" stroke="url(#sms-grad)" strokeWidth="0.5" strokeOpacity="0.3" />
                          <path d="M3 9h18M3 15h18" stroke="url(#sms-grad)" strokeWidth="2" strokeLinecap="round" />
                          <path d="M7 6l3 3-3 3M17 12l-3 3 3 3" stroke="url(#sms-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="9" r="2" fill="url(#sms-grad)" />
                          <circle cx="12" cy="15" r="2" fill="url(#sms-grad)" />
                        </svg>
                      )}
                      {ch.id === 'email' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="email-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0EA5E9" />
                              <stop offset="100%" stopColor="#2563EB" />
                            </linearGradient>
                          </defs>
                          <rect x="3" y="5" width="18" height="14" rx="2" stroke="url(#email-grad)" strokeWidth="1.5" fill="none" />
                          <path d="M3 7l9 6 9-6" stroke="url(#email-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3 17l6.5-5.5M21 17l-6.5-5.5" stroke="url(#email-grad)" strokeWidth="1" strokeLinecap="round" />
                          <circle cx="12" cy="11" r="1.5" fill="url(#email-grad)" />
                        </svg>
                      )}
                      {ch.id === 'rcs' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="rcs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#F59E0B" />
                              <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                          </defs>
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" stroke="url(#rcs-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          <path d="M6 7h8M6 11h12" stroke="url(#rcs-grad)" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M15 4.5a3 3 0 013 3M14 2a6 6 0 016 6" stroke="url(#rcs-grad)" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="18" cy="8" r="1" fill="url(#rcs-grad)" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white transition-colors duration-300">{ch.name}</h5>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">{ch.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Split Screen Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Input Columns */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/[0.05] rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Campaign Parameters</h3>
                    <p className="text-[10px] text-slate-400">Map segment values and outbound variables.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Target Outbox Size</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{filteredShoppers.length} shoppers</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1.5">Campaign Name</label>
                    <input
                      type="text"
                      placeholder="e.g. VIP Loyalty Outbound June"
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/[0.08] focus:border-purple-500 rounded-xl px-3 py-2.5 text-white focus:outline-none transition"
                    />
                  </div>

                  {activeChannel === 'email' && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-white/[0.06] space-y-2">
                      <label className="block text-[8px] uppercase font-bold text-slate-400">Email Subject Line</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-400 rounded-lg px-2 py-1.5 text-white focus:outline-none transition"
                      />
                    </div>
                  )}

                  {/* AI Copywriting integration */}
                  <div className="p-4 bg-purple-900/5 border border-purple-500/20 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-purple-400 tracking-wider flex items-center space-x-1.5">
                        {/* Sparkle SVG */}
                        <svg className="w-3.5 h-3.5 text-purple-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M5 3v4M3 5h4M6 17v4M4 19h4" />
                        </svg>
                        <span>AI Copywriter Co-Pilot</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiAssistantOpen(!aiAssistantOpen)}
                        className="text-[9px] text-slate-400 hover:text-white underline"
                      >
                        {aiAssistantOpen ? 'Hide' : 'Open Assistant'}
                      </button>
                    </div>

                    {aiAssistantOpen && (
                      <div className="space-y-3 pt-2 border-t border-white/[0.04] text-[11px] animate-scale-in">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] text-slate-400 mb-1">Tone Type</label>
                            <select
                              value={aiTone}
                              onChange={e => setAiTone(e.target.value)}
                              className="w-full bg-slate-950 border border-white/[0.08] rounded p-1 text-[10px] text-white focus:outline-none"
                            >
                              <option value="VIP">VIP (Concierge)</option>
                              <option value="Churning">Churning (High Urgency)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] text-slate-400 mb-1">Target Category/Product</label>
                            <input
                              type="text"
                              value={aiProduct}
                              onChange={e => setAiProduct(e.target.value)}
                              className="w-full bg-slate-950 border border-white/[0.08] rounded p-1 text-[10px] text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={generatingAiCopy}
                          onClick={runAiCopywriter}
                          className="w-full py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded font-bold hover:bg-purple-500/30 transition text-[10px]"
                        >
                          {generatingAiCopy ? "Composing copy templates..." : "Generate AI Copy Options"}
                        </button>

                        {aiCopyOptions.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                            <span className="block text-[8px] uppercase font-bold text-slate-400">Suggested Templates:</span>
                            {aiCopyOptions.map((opt, i) => (
                              <div
                                key={i}
                                onClick={() => { setMessageTemplate(opt); setAiAssistantOpen(false); }}
                                className="p-3 bg-slate-950 border border-white/[0.05] hover:border-purple-500/40 rounded-xl cursor-pointer text-[10px] italic text-slate-300 transition"
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Template text area */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Outbox Message Template</label>
                    <textarea
                      rows="4"
                      value={messageTemplate}
                      onChange={e => setMessageTemplate(e.target.value)}
                      className="w-full bg-slate-950 border border-white/[0.08] focus:border-purple-500 rounded-xl px-3 py-2 text-white focus:outline-none font-mono leading-relaxed"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                      <span>Bindings: [first_name], [city], [email]</span>
                      <span>{messageTemplate.length} characters</span>
                    </div>
                  </div>

                  {/* Action trigger button */}
                  <button
                    type="button"
                    disabled={filteredShoppers.length === 0 || isLaunching}
                    onClick={() => setShowLaunchModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:opacity-95 transition flex items-center justify-center space-x-2 text-xs shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                  >
                    <span>🚀 Launch Campaign Asynchronously</span>
                  </button>
                </div>
              </div>

              {/* Smartphone Mockup */}
              <div className="flex justify-center items-center">
                <div className="w-[285px] h-[555px] bg-slate-900 border-[8px] border-slate-950 rounded-[40px] shadow-2xl relative flex flex-col overflow-hidden ring-1 ring-white/10 shadow-[0_0_50px_rgba(139,92,246,0.15)]">
                  
                  {/* Notch */}
                  <div className="absolute top-0 inset-x-0 h-6 bg-slate-950 flex items-center justify-center z-20">
                    <div className="w-16 h-3.5 bg-slate-900 border border-white/5 rounded-full flex items-center justify-end px-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80" />
                    </div>
                  </div>

                  {/* Screen Header */}
                  <div className="h-8 bg-slate-950 shrink-0 flex items-end justify-between px-5 pb-1.5 text-[8px] text-slate-400 font-mono z-10">
                    <span>15:50</span>
                    <div className="flex items-center space-x-1">
                      <span>5G</span>
                      <span className="w-2.5 h-1.5 border border-slate-400 rounded-sm" />
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border-b border-white/[0.04] p-3 flex items-center space-x-2 shrink-0">
                    <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-white/10">
                      CRM
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-white uppercase">{activeChannel} Outbound</span>
                      <span className="block text-[7px] text-emerald-400 font-mono font-bold animate-pulse">SIMULATION PREVIEW</span>
                    </div>
                  </div>

                  {/* Message body frame */}
                  <div className="flex-1 bg-slate-950 p-4 flex flex-col justify-end overflow-y-auto">
                    {activeChannel === 'email' ? (
                      <div className="bg-slate-900 border border-white/[0.05] rounded-xl p-3 space-y-1.5 text-[9px] text-slate-300">
                        <div className="border-b border-white/[0.06] pb-1.5 text-slate-400">
                          <span>Subject: <strong className="text-white">{emailSubject}</strong></span>
                        </div>
                        <p className="whitespace-pre-line leading-relaxed font-sans">{getSmartphonePreview()}</p>
                      </div>
                    ) : (
                      <div className="max-w-[85%] self-end space-y-1">
                        <div className={`p-3 rounded-2xl text-[10px] leading-relaxed text-slate-100 rounded-tr-none ${
                          activeChannel === 'whatsapp' ? 'bg-emerald-900/30 border border-emerald-500/20' :
                          activeChannel === 'sms' ? 'bg-indigo-900/30 border border-indigo-500/20' :
                          'bg-amber-900/30 border border-amber-500/20'
                        }`}>
                          <p className="whitespace-pre-line">{getSmartphonePreview()}</p>
                        </div>
                        <span className="block text-[7px] text-slate-500 text-right">Previewing bindings</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Launch confirmation Modal */}
            {showLaunchModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-sm bg-slate-950 border border-white/[0.08] rounded-2xl p-6 space-y-5 animate-scale-in">
                  <div className="flex items-center space-x-2 text-purple-400">
                    {/* Sparkle SVG */}
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M5 3v4M3 5h4M6 17v4M4 19h4" />
                    </svg>
                    <h3 className="text-sm font-extrabold text-white">Execute Outbound Queue</h3>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Confirm launching this campaign targeting <strong className="text-emerald-400 font-mono">{filteredShoppers.length} consumers</strong>. Tasks will be asynchronously processed.
                  </p>

                  <div className="flex items-center justify-end space-x-2 text-[10px]">
                    <button
                      type="button" onClick={() => setShowLaunchModal(false)}
                      className="px-3 py-1.5 border border-white/[0.06] bg-slate-900 rounded-lg text-slate-400 hover:bg-slate-800 transition"
                    >
                      Abort
                    </button>
                    <button
                      type="button" onClick={handleLaunchCampaign}
                      className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-lg hover:opacity-90 transition shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                    >
                      Confirm Launch
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            WORKSPACE 3: REAL-TIME TELEMETRY INSIGHTS
           ========================================== */}
        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Left 2/3: metrics and custom graphs */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* North-Star Metric Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/40 backdrop-blur-md border-l-2 border-l-purple-500 border-y border-r border-white/[0.05] p-5 rounded-2xl space-y-2 hover:bg-slate-900/60 transition duration-300">
                  <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase block">Total Dispatched</span>
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-white font-mono">{metrics.dispatched}</h3>
                    {metrics.pending > 0 && (
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                      </span>
                    )}
                  </div>
                  <span className="block text-[8px] text-slate-500 font-mono">NODE_QUEUE_INGEST // TOTAL</span>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border-l-2 border-l-emerald-500 border-y border-r border-white/[0.05] p-5 rounded-2xl space-y-2 hover:bg-slate-900/60 transition duration-300">
                  <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase block">Delivery Success Rate</span>
                  <h3 className="text-2xl font-black text-white font-mono">
                    {metrics.dispatched > 0
                      ? ((metrics.delivered + metrics.read) / metrics.dispatched * 100).toFixed(1)
                      : '0.0'}%
                  </h3>
                  <span className="block text-[8px] text-emerald-400 font-bold font-mono">
                    {metrics.delivered} DELIVERED • {metrics.read} READ
                  </span>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border-l-2 border-l-sky-500 border-y border-r border-white/[0.05] p-5 rounded-2xl space-y-2 hover:bg-slate-900/60 transition duration-300">
                  <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase block">Engagement Rate</span>
                  <h3 className="text-2xl font-black text-white font-mono">
                    {metrics.dispatched > 0
                      ? (metrics.read / metrics.dispatched * 100).toFixed(1)
                      : '0.0'}%
                  </h3>
                  <span className="block text-[8px] text-slate-500 font-mono">READS_RESOLVED // RATIO</span>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border-l-2 border-l-amber-500 border-y border-r border-white/[0.05] p-5 rounded-2xl space-y-2 hover:bg-slate-900/60 transition duration-300">
                  <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase block">Conversions Revenue</span>
                  <h3 className="text-2xl font-black text-white font-mono">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(metrics.revenue)}
                  </h3>
                  <span className="block text-[8px] text-amber-400 font-bold flex items-center space-x-1 font-mono">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>LTV_ESTIMATE // COMPLETED</span>
                  </span>
                </div>
              </div>

              {/* Dynamic SVG Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Donut segment rings */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/[0.05] rounded-2xl p-6 flex flex-col justify-between h-[280px]">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Status Concentric HUD</h4>
                    <p className="text-[10px] text-slate-500">Visualizing real-time carrier feedback.</p>
                  </div>

                  <div className="flex justify-center items-center py-2">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Delivered progress circle */}
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.01)" strokeWidth="6" />
                        <circle
                          cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" strokeWidth="6"
                          strokeDasharray={`${251.3 * (metrics.dispatched > 0 ? (metrics.delivered / metrics.dispatched) : 0.70)} 251.3`}
                          className="transition-all duration-700 ease-out"
                        />
                        {/* Read progress circle */}
                        <circle cx="50" cy="50" r="30" fill="transparent" stroke="rgba(255,255,255,0.01)" strokeWidth="6" />
                        <circle
                          cx="50" cy="50" r="30" fill="transparent" stroke="#8B5CF6" strokeWidth="6"
                          strokeDasharray={`${188.5 * (metrics.dispatched > 0 ? (metrics.read / metrics.dispatched) : 0.20)} 188.5`}
                          className="transition-all duration-700 ease-out"
                        />
                        {/* Failed progress circle */}
                        <circle cx="50" cy="50" r="20" fill="transparent" stroke="rgba(255,255,255,0.01)" strokeWidth="6" />
                        <circle
                          cx="50" cy="50" r="20" fill="transparent" stroke="#EF4444" strokeWidth="6"
                          strokeDasharray={`${125.6 * (metrics.dispatched > 0 ? (metrics.failed / metrics.dispatched) : 0.10)} 125.6`}
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-bold font-mono text-white">{metrics.dispatched}</span>
                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Total</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend layout */}
                  <div className="grid grid-cols-3 gap-1.5 text-[9px] text-slate-400 border-t border-white/[0.04] pt-2">
                    <div className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Del: {metrics.delivered}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span>Read: {metrics.read}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>Fail: {metrics.failed}</span>
                    </div>
                  </div>
                </div>

                {/* Coordinate Line Graph */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/[0.05] rounded-2xl p-6 flex flex-col justify-between h-[280px]">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Real-time Volume ticks</h4>
                    <p className="text-[10px] text-slate-500">Live operational streaming indices.</p>
                  </div>

                  {/* Area Line Chart SVG */}
                  <div className="h-32 w-full pt-2">
                    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines */}
                      <line x1="15" y1="10" x2="285" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="15" y1="50" x2="285" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="15" y1="90" x2="285" y2="90" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                      
                      {/* Gradient Fill Area */}
                      <path d={getSvgFillPath()} fill="url(#area-grad)" className="transition-all duration-500" />
                      
                      {/* Glowing Line */}
                      <polyline
                        fill="none" stroke="#8B5CF6" strokeWidth="1.5"
                        points={getSvgPolylinePoints()}
                        className="transition-all duration-500"
                        strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/[0.04] pt-2 text-[9px] text-slate-500">
                    <span>Live volume tracking</span>
                    <span className="text-purple-400 font-bold font-mono">10x resolution</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Console Activity Logger */}
            <div className="lg:col-span-1 bg-black border border-white/[0.05] rounded-2xl h-[585px] flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-[#0D111A] border-b border-white/[0.06] p-4 flex items-center justify-between shrink-0">
                {/* Telemetry Badge */}
                <div className="flex items-center space-x-2.5 bg-slate-950/80 border border-white/[0.05] rounded-lg px-2.5 py-1.5 shadow-inner">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 xeno-node-pulse"></span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-300 font-mono tracking-wider">
                    CORE_NODE_01 // DISPATCH_STREAM_ACTIVE
                  </span>
                </div>
                {/* Clear Console button with professional icon */}
                <button
                  onClick={() => setConsoleLogs([])}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-lg text-[9px] font-bold text-slate-300 hover:text-white transition duration-150 font-mono"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear Console</span>
                </button>
              </div>

              {/* Console logs output */}
              <div className="flex-1 p-5 overflow-y-auto font-mono text-[9px] leading-relaxed space-y-2.5 bg-black/90 scrollbar-none">
                {consoleLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600">
                    <span className="animate-pulse">Awaiting outbound telemetry...</span>
                  </div>
                ) : (
                  consoleLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-slate-500">[{log.timestamp}]</span>
                      <span className={`
                        ${log.status === 'success' ? 'text-emerald-400' : ''}
                        ${log.status === 'error' ? 'text-red-400 font-bold animate-pulse' : ''}
                        ${log.status === 'warning' ? 'text-amber-300' : ''}
                        ${log.status === 'info' ? 'text-purple-400' : ''}
                        ${!log.status ? 'text-slate-300' : ''}
                      `}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logTerminalEndRef} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Shared Slide-Over Glassmorphic Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-[420px] bg-[#0F1322]/90 backdrop-blur-xl border-l border-white/0.05 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform translate-x-0">
              
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-slate-950/20">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    {drawerFormType === 'single' && 'Add New Shopper Profile'}
                    {drawerFormType === 'transaction' && 'Ingest Order Transaction'}
                    {drawerFormType === 'bulk' && 'Bulk Data Utility'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {drawerFormType === 'single' && 'Register a single customer identity.'}
                    {drawerFormType === 'transaction' && 'Log transactional values for a shopper.'}
                    {drawerFormType === 'bulk' && 'Ingest batch arrays of shoppers or orders.'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition duration-150 font-bold"
                >
                  ✖
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Form Type: Single Shopper Ingest */}
                {drawerFormType === 'single' && (
                  <form onSubmit={handleShopperSubmit} className="space-y-4 text-[11px]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">First Name</label>
                        <input
                          type="text" required value={shopperForm.first_name}
                          onChange={e => setShopperForm({...shopperForm, first_name: e.target.value})}
                          className="w-full bg-slate-950 border border-white/[0.08] focus:border-purple-500 rounded-lg px-2.5 py-2 text-white focus:outline-none transition duration-150"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Last Name</label>
                        <input
                          type="text" required value={shopperForm.last_name}
                          onChange={e => setShopperForm({...shopperForm, last_name: e.target.value})}
                          className="w-full bg-slate-950 border border-white/[0.08] focus:border-purple-500 rounded-lg px-2.5 py-2 text-white focus:outline-none transition duration-150"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Email Identifier</label>
                      <input
                        type="email" required value={shopperForm.email}
                        onChange={e => setShopperForm({...shopperForm, email: e.target.value})}
                        className="w-full bg-slate-950 border border-white/[0.08] focus:border-purple-500 rounded-lg px-2.5 py-2 text-white focus:outline-none transition duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Phone String</label>
                      <input
                        type="text" required value={shopperForm.phone}
                        onChange={e => setShopperForm({...shopperForm, phone: e.target.value})}
                        className="w-full bg-slate-950 border border-white/[0.08] focus:border-purple-500 rounded-lg px-2.5 py-2 text-white focus:outline-none transition duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Location (City)</label>
                      <input
                        type="text" required value={shopperForm.city}
                        onChange={e => setShopperForm({...shopperForm, city: e.target.value})}
                        className="w-full bg-slate-950 border border-white/[0.08] focus:border-purple-500 rounded-lg px-2.5 py-2 text-white focus:outline-none transition duration-150"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:opacity-95 transition"
                    >
                      Register Shopper Profile
                    </button>
                  </form>
                )}

                {/* Form Type: Transaction Ingest */}
                {drawerFormType === 'transaction' && (
                  <form onSubmit={handleOrderSubmit} className="space-y-4 text-[11px]">
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Shopper Email</label>
                      <input
                        type="email" required placeholder="name@example.com"
                        value={orderForm.shopper_email}
                        onChange={e => setOrderForm({...orderForm, shopper_email: e.target.value})}
                        className="w-full bg-slate-950 border border-white/[0.08] focus:border-emerald-500 rounded-lg px-2.5 py-2 text-white focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Product Name</label>
                      <input
                        type="text" required placeholder="e.g. Classic Watch"
                        value={orderForm.product_name || ''}
                        onChange={e => setOrderForm({...orderForm, product_name: e.target.value})}
                        className="w-full bg-slate-950 border border-white/[0.08] focus:border-emerald-500 rounded-lg px-2.5 py-2 text-white focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Order Amount (INR)</label>
                      <input
                        type="number" required placeholder="e.g. 7500"
                        value={orderForm.amount}
                        onChange={e => setOrderForm({...orderForm, amount: e.target.value})}
                        className="w-full bg-slate-950 border border-white/[0.08] focus:border-emerald-500 rounded-lg px-2.5 py-2 text-white focus:outline-none transition"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-extrabold rounded-lg hover:opacity-95 transition"
                    >
                      Commit Order Logs
                    </button>
                  </form>
                )}

                {/* Form Type: Bulk JSON Loader */}
                {drawerFormType === 'bulk' && (
                  <div className="space-y-6">
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-3">Bulk Ingestion Station</span>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[8px] uppercase font-bold text-slate-500 mb-1">Shopper Array (JSON)</label>
                          <textarea
                            rows="4" placeholder='[{"email":"x@y.com","first_name":"Raj"}]'
                            value={bulkShoppersText} onChange={e => setBulkShoppersText(e.target.value)}
                            className="w-full bg-slate-950 border border-white/[0.08] rounded-lg p-2.5 text-[10px] font-mono text-white focus:outline-none focus:border-purple-500"
                          />
                          <button
                            type="button" onClick={handleBulkShoppers}
                            className="w-full mt-2 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg font-bold transition text-[10px]"
                          >
                            Process Shoppers
                          </button>
                        </div>

                        <div className="border-t border-white/[0.04] pt-4">
                          <label className="block text-[8px] uppercase font-bold text-slate-500 mb-1">Orders Array (JSON)</label>
                          <textarea
                            rows="4" placeholder='[{"shopper_email":"x@y.com","amount":2500}]'
                            value={bulkOrdersText} onChange={e => setBulkOrdersText(e.target.value)}
                            className="w-full bg-slate-950 border border-white/[0.08] rounded-lg p-2.5 text-[10px] font-mono text-white focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button" onClick={handleBulkOrders}
                            className="w-full mt-2 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg font-bold transition text-[10px]"
                          >
                            Process Orders
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Ledger info */}
      <footer className="bg-slate-950/80 border-t border-white/[0.05] py-3.5 px-8 flex justify-between items-center text-[9px] text-slate-500 font-mono tracking-widest shrink-0">
        <span>XENO CRM OPERATIONAL STUB NODE</span>
        <span>June 2026 REFERENCE ERA</span>
      </footer>
    </div>
  );
}
