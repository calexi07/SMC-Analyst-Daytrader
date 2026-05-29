// ── Supabase Configuration ──
const SUPABASE_URL  = 'https://xdkotivakfvohbzinjoq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhka290aXZha2Z2b2hiemluam9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDUyMjAsImV4cCI6MjA5NTYyMTIyMH0._TAroOTagl8sRG51-RqDjAXT1RmyjMr8Siq_jltPv9c';

// ── Trading Pairs ──
const TRADING_PAIRS = [
  // USD Pairs
  { value: 'EURUSD',  label: 'EUR/USD',  group: 'USD Pairs' },
  { value: 'GBPUSD',  label: 'GBP/USD',  group: 'USD Pairs' },
  { value: 'AUDUSD',  label: 'AUD/USD',  group: 'USD Pairs' },
  { value: 'NZDUSD',  label: 'NZD/USD',  group: 'USD Pairs' },
  { value: 'USDCHF',  label: 'USD/CHF',  group: 'USD Pairs' },
  { value: 'USDCAD',  label: 'USD/CAD',  group: 'USD Pairs' },
  { value: 'USDJPY',  label: 'USD/JPY',  group: 'USD Pairs' },
  // JPY Crosses
  { value: 'GBPJPY',  label: 'GBP/JPY',  group: 'JPY Crosses' },
  { value: 'EURJPY',  label: 'EUR/JPY',  group: 'JPY Crosses' },
  { value: 'AUDJPY',  label: 'AUD/JPY',  group: 'JPY Crosses' },
  // GBP Crosses
  { value: 'GBPAUD',  label: 'GBP/AUD',  group: 'GBP Crosses' },
  { value: 'EURGBP',  label: 'EUR/GBP',  group: 'GBP Crosses' },
  // AUD Crosses
  { value: 'AUDCHF',  label: 'AUD/CHF',  group: 'AUD Crosses' },
  { value: 'AUDNZD',  label: 'AUD/NZD',  group: 'AUD Crosses' },
  { value: 'EURAUD',  label: 'EUR/AUD',  group: 'AUD Crosses' },
  // Metals & Indices
  { value: 'XAUUSD',  label: 'XAU/USD (Gold)',  group: 'Metals & Indices' },
  { value: 'GER40',   label: 'GER40 (DAX)',      group: 'Metals & Indices' },
  { value: 'NAS100',  label: 'NAS100 (Nasdaq)',   group: 'Metals & Indices' },
];

// ── Timeframes ──
const TIMEFRAMES = [
  { key: 'weekly', label: 'Weekly',  cssClass: 'weekly' },
  { key: 'daily',  label: 'Daily',   cssClass: 'daily'  },
  { key: 'h4',     label: '4H',      cssClass: 'h4'     },
];

// ── Zone Status Options ──
const ZONE_STATUSES = ['fresh', 'tested', 'broken'];
