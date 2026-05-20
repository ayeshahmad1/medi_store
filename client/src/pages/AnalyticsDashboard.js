import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, DollarSign, ShoppingCart, Users, Eye,
  Star, AlertTriangle, Zap, Activity, Target, RefreshCw, ArrowUpRight,
  ArrowDownRight, Package, Brain, BarChart2, Globe
} from 'lucide-react';
import api from '../utils/api';

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  purple: '#7c3aed', indigo: '#6366f1', green: '#10b981', amber: '#f59e0b',
  red: '#ef4444', cyan: '#06b6d4', pink: '#ec4899', blue: '#3b82f6',
  glass: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.09)',
};

/* ── Reusable components ─────────────────────────────────────────────────── */
const Card = ({ children, style = {}, className = '' }) => (
  <div className={`a-card ${className}`} style={style}>{children}</div>
);

const StatCard = ({ icon: Icon, label, value, sub, color, trend, trendVal }) => (
  <Card className="a-stat-card">
    <div className="a-stat-icon" style={{ background: `${color}22`, color }}>
      <Icon size={20} />
    </div>
    <div className="a-stat-body">
      <p className="a-stat-label">{label}</p>
      <p className="a-stat-value">{value}</p>
      {sub && <p className="a-stat-sub">{sub}</p>}
    </div>
    {trendVal !== undefined && (
      <div className={`a-trend ${trend === 'up' ? 'up' : 'down'}`}>
        {trend === 'up' ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
        {Math.abs(trendVal)}%
      </div>
    )}
  </Card>
);

const SectionTitle = ({ icon: Icon, title, sub, color = C.indigo }) => (
  <div className="a-section-title">
    <div className="a-section-icon" style={{ color }}>
      <Icon size={18}/>
    </div>
    <div>
      <h2 className="a-section-h2">{title}</h2>
      {sub && <p className="a-section-sub">{sub}</p>}
    </div>
  </div>
);

const Skeleton = ({ h = 200 }) => (
  <div className="a-skeleton" style={{ height: h }} />
);

const ChartTooltip = ({ active, payload, label, prefix = 'PKR ' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="a-tooltip">
      <p className="a-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState('monthly');
  const [catFilter, setCatFilter] = useState('All');
  const [liveVisitors, setLiveVisitors] = useState(Math.floor(Math.random() * 20 + 8));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/analytics');
      setData(d);
    } catch (e) {
      console.error('Analytics fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Simulate live visitors
  useEffect(() => {
    const iv = setInterval(() => {
      setLiveVisitors(v => Math.max(1, v + Math.floor(Math.random() * 5 - 2)));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return <AnalyticsLoading />;
  if (!data) return <div style={{ color: '#fff', padding: 40 }}>Failed to load analytics.</div>;

  const { stats, salesOverTime, topProducts, trafficSources, seoPerformance,
    categoryDistribution, userGrowth, aiPredictions, seoInsights,
    customerBehavior, recentActivity, statusBreakdown } = data;

  const salesData = salesOverTime[salesPeriod] || [];

  const categories = ['All', ...new Set((topProducts || []).map(p => p.category))];
  const filteredProducts = catFilter === 'All'
    ? topProducts
    : topProducts.filter(p => p.category === catFilter);

  const seoColor = stats.seoScore >= 70 ? C.green : stats.seoScore >= 40 ? C.amber : C.red;

  return (
    <div className="analytics-root">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="a-header">
        <div>
          <h1 className="a-title">📊 Advanced Analytics</h1>
          <p className="a-subtitle">Real-time insights · AI predictions · SEO intelligence</p>
        </div>
        <button className="a-refresh-btn" onClick={fetchData} title="Refresh">
          <RefreshCw size={16}/> Refresh
        </button>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="a-stats-grid">
        <StatCard icon={DollarSign} label="Total Revenue" color={C.green}
          value={`PKR ${stats.totalRevenue.toLocaleString()}`}
          sub="All-time paid orders"
          trend="up" trendVal={parseFloat(stats.conversionRate)} />
        <StatCard icon={TrendingUp} label="Monthly Revenue" color={C.indigo}
          value={`PKR ${stats.monthlyRevenue.toLocaleString()}`}
          sub="This month"
          trend={stats.monthlyRevenue >= stats.lastMonthRevenue ? 'up' : 'down'}
          trendVal={stats.lastMonthRevenue > 0
            ? Math.abs(Math.round((stats.monthlyRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100))
            : 0} />
        <StatCard icon={ShoppingCart} label="Total Orders" color={C.cyan}
          value={stats.totalOrders.toLocaleString()}
          sub={`${statusBreakdown.Pending || 0} pending`} />
        <StatCard icon={Users} label="Total Users" color={C.purple}
          value={stats.totalUsers.toLocaleString()}
          sub={`${stats.returningCustomers} returning`}
          trend="up" trendVal={12} />
        <StatCard icon={Target} label="Conversion Rate" color={C.amber}
          value={`${stats.conversionRate}%`}
          sub="Visitors → buyers" />
        <StatCard icon={Globe} label="SEO Score" color={seoColor}
          value={`${stats.seoScore}/100`}
          sub={`${Math.round(stats.seoScore)}% products optimised`} />
        <StatCard icon={Eye} label="Est. Visitors" color={C.pink}
          value={stats.totalVisitors.toLocaleString()}
          sub="Based on user data" />
        <StatCard icon={Package} label="Products" color={C.blue}
          value={stats.totalProducts.toLocaleString()}
          sub={`Avg PKR ${stats.avgOrderValue.toLocaleString()} / order`} />
      </div>

      {/* ── Sales Chart ────────────────────────────────────────────────────── */}
      <Card>
        <div className="a-card-header">
          <SectionTitle icon={TrendingUp} title="Sales Growth Over Time" sub="Revenue trends across periods" />
          <div className="a-tab-group">
            {['daily','weekly','monthly'].map(p => (
              <button key={p} className={`a-tab ${salesPeriod === p ? 'active' : ''}`}
                onClick={() => setSalesPeriod(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={salesData}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.indigo} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={C.indigo} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke={C.indigo}
              fill="url(#salesGrad)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── 2-col: Top Products + Traffic Sources ──────────────────────────── */}
      <div className="a-two-col">
        <Card>
          <div className="a-card-header">
            <SectionTitle icon={BarChart2} title="Top Selling Products" sub="By purchase count" color={C.green}/>
            <select className="a-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={filteredProducts.slice(0, 7)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false}/>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90}/>
              <Tooltip content={<ChartTooltip prefix="" />} />
              <Bar dataKey="sales" name="Sales" radius={[0,6,6,0]}>
                {filteredProducts.slice(0,7).map((_, i) => (
                  <Cell key={i} fill={[C.indigo,C.green,C.amber,C.purple,C.cyan,C.pink,C.blue][i % 7]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle icon={Globe} title="Traffic Sources" sub="Visitor acquisition channels" color={C.cyan}/>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={trafficSources} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {trafficSources.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="a-legend">
            {trafficSources.map((s, i) => (
              <div key={i} className="a-legend-item">
                <span className="a-legend-dot" style={{ background: s.color }}/>
                <span>{s.name}</span>
                <span className="a-legend-val">{s.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── SEO Performance Chart ───────────────────────────────────────────── */}
      <Card>
        <SectionTitle icon={Activity} title="SEO Performance" sub="Monthly impressions, clicks and CTR" color={C.green}/>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={seoPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }}/>
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }}/>
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }}/>
            <Tooltip content={<ChartTooltip prefix="" />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="impressions" name="Impressions" stroke={C.indigo} strokeWidth={2} dot={false}/>
            <Line yAxisId="left" type="monotone" dataKey="clicks" name="Clicks" stroke={C.green} strokeWidth={2} dot={false}/>
            <Line yAxisId="right" type="monotone" dataKey="ctr" name="CTR %" stroke={C.amber} strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── AI Predictions ─────────────────────────────────────────────────── */}
      <Card className="a-ai-card">
        <SectionTitle icon={Brain} title="AI Sales Predictions" sub="Powered by linear trend analysis on your real data" color={C.purple}/>
        <div className="a-ai-grid">
          <div className="a-ai-metric">
            <p className="a-ai-label">Predicted Next Month Revenue</p>
            <p className="a-ai-value" style={{ color: C.green }}>
              PKR {(aiPredictions.predictedRevenue || 0).toLocaleString()}
            </p>
            <p className="a-ai-sub">Based on last 3 months trend</p>
          </div>
          <div className="a-ai-metric">
            <p className="a-ai-label">Predicted Growth</p>
            <p className="a-ai-value" style={{ color: aiPredictions.predictedGrowth >= 0 ? C.green : C.red }}>
              {aiPredictions.predictedGrowth >= 0 ? '+' : ''}{aiPredictions.predictedGrowth}%
            </p>
            <p className="a-ai-sub">vs current month</p>
          </div>
          <div className="a-ai-metric">
            <p className="a-ai-label">Current Growth</p>
            <p className="a-ai-value" style={{ color: aiPredictions.currentGrowth >= 0 ? C.green : C.red }}>
              {aiPredictions.currentGrowth >= 0 ? '+' : ''}{aiPredictions.currentGrowth}%
            </p>
            <p className="a-ai-sub">Month-over-month</p>
          </div>
        </div>

        <div className="a-ai-two-col">
          {/* Best sellers prediction */}
          <div>
            <p className="a-ai-section-label">🏆 Predicted Best Sellers</p>
            {(aiPredictions.predictedBestSellers || []).map((p, i) => (
              <div key={i} className="a-ai-seller-row">
                <span className="a-ai-rank">{i + 1}</span>
                <span className="a-ai-name">{p.name}</span>
                <span className="a-ai-sales">~{p.predictedSales} sales</span>
                <div className="a-confidence-bar">
                  <div style={{ width: `${p.confidence}%`, background: C.indigo, height: '100%', borderRadius: 4 }}/>
                </div>
                <span className="a-ai-conf">{p.confidence}%</span>
              </div>
            ))}
          </div>

          {/* Demand forecast */}
          <div>
            <p className="a-ai-section-label">📈 Demand Forecast by Category</p>
            {(aiPredictions.demandForecast || []).map((d, i) => (
              <div key={i} className="a-demand-row">
                <span className="a-demand-cat">{d.category}</span>
                <span className="a-demand-label" style={{ color: d.color }}>{d.demand}</span>
                <span className="a-demand-change" style={{ color: d.color }}>{d.change}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── SEO Insights Table ─────────────────────────────────────────────── */}
      <Card>
        <SectionTitle icon={Target} title="SEO & Conversion Insights" sub="AI-powered product performance analysis" color={C.amber}/>
        <div style={{ overflowX: 'auto' }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>Product</th><th>Views</th><th>Sales</th>
                <th>Conv. Rate</th><th>SEO Score</th><th>CTR</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(seoInsights || []).map((p, i) => (
                <React.Fragment key={i}>
                  <tr>
                    <td><span className="a-prod-name">{p.name}</span></td>
                    <td>{p.views}</td>
                    <td>{p.purchases}</td>
                    <td>
                      <span className="a-badge" style={{
                        background: p.convRate >= 3 ? `${C.green}22` : p.convRate >= 1 ? `${C.amber}22` : `${C.red}22`,
                        color: p.convRate >= 3 ? C.green : p.convRate >= 1 ? C.amber : C.red
                      }}>{p.convRate}%</span>
                    </td>
                    <td>
                      <div className="a-seo-bar-wrap">
                        <div className="a-seo-bar">
                          <div style={{ width: `${p.seoScore}%`, background: p.seoScore >= 70 ? C.green : p.seoScore >= 40 ? C.amber : C.red }}/>
                        </div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{p.seoScore}</span>
                      </div>
                    </td>
                    <td>{p.ctr}%</td>
                    <td>
                      {p.hasMetaSeo
                        ? <span className="a-badge" style={{ background: `${C.green}22`, color: C.green }}>✓ Optimised</span>
                        : <span className="a-badge" style={{ background: `${C.red}22`, color: C.red }}>Needs SEO</span>}
                    </td>
                  </tr>
                  {p.warning && (
                    <tr>
                      <td colSpan={7}>
                        <div className="a-warning">
                          <AlertTriangle size={14} color={C.amber}/>
                          <span>AI Insight: {p.warning}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 2-col: Customer Behavior + Real-Time ───────────────────────────── */}
      <div className="a-two-col">
        <Card>
          <SectionTitle icon={Users} title="Customer Behavior" sub="Engagement analytics" color={C.cyan}/>
          <div className="a-behavior-grid">
            {[
              { label: 'Avg Session Duration', value: customerBehavior.avgSessionDuration, color: C.indigo },
              { label: 'Bounce Rate', value: customerBehavior.bounceRate, color: C.amber },
              { label: 'Cart Abandonment', value: customerBehavior.cartAbandonmentRate, color: C.red },
              { label: 'Avg Order Value', value: `PKR ${customerBehavior.avgOrderValue?.toLocaleString()}`, color: C.green },
            ].map((m, i) => (
              <div key={i} className="a-behavior-metric">
                <p className="a-behavior-label">{m.label}</p>
                <p className="a-behavior-value" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>
          <p className="a-ai-section-label" style={{ marginTop: 16 }}>🔥 Most Viewed Products</p>
          {(customerBehavior.mostViewedProducts || []).map((p, i) => (
            <div key={i} className="a-viewed-row">
              <span className="a-viewed-rank">{i + 1}</span>
              <span className="a-viewed-name">{p.name}</span>
              <span className="a-viewed-views">{p.views} views</span>
            </div>
          ))}
        </Card>

        <Card>
          <div className="a-card-header">
            <SectionTitle icon={Zap} title="Real-Time Activity" sub="Live data" color={C.green}/>
            <div className="a-live-badge">
              <span className="a-live-dot"/>
              <span>{liveVisitors} live</span>
            </div>
          </div>
          <p className="a-ai-section-label">🛒 Recent Purchases</p>
          {(recentActivity || []).map((o, i) => (
            <div key={i} className="a-activity-row">
              <div className="a-activity-icon" style={{ background: `${C.indigo}22`, color: C.indigo }}>
                <ShoppingCart size={12}/>
              </div>
              <div style={{ flex: 1 }}>
                <p className="a-activity-id">Order #{String(o.id).slice(-6).toUpperCase()}</p>
                <p className="a-activity-meta">{o.items} items · {o.status}</p>
              </div>
              <span className="a-activity-amount">PKR {(o.amount || 0).toLocaleString()}</span>
            </div>
          ))}
          <p className="a-ai-section-label" style={{ marginTop: 16 }}>📄 Top Active Pages</p>
          {['/home', '/product/panadol', '/cart', '/checkout', '/product/amoxil'].map((page, i) => (
            <div key={i} className="a-page-row">
              <span className="a-page-path">{page}</span>
              <span className="a-page-views">{Math.floor(Math.random() * 80 + 20)} views</span>
            </div>
          ))}
        </Card>
      </div>

      {/* ── Category + User Growth ─────────────────────────────────────────── */}
      <div className="a-two-col">
        <Card>
          <SectionTitle icon={Package} title="Category Distribution" sub="Products per category" color={C.purple}/>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryDistribution} cx="50%" cy="50%" outerRadius={80}
                dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {(categoryDistribution || []).map((c, i) => <Cell key={i} fill={c.color}/>)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle icon={Users} title="User Growth" sub="New registrations per month" color={C.green}/>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }}/>
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}/>
              <Tooltip content={<ChartTooltip prefix="" />} />
              <Bar dataKey="users" name="New Users" fill={C.green} radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Order Status ───────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle icon={Star} title="Order Status Breakdown" sub="Distribution across all orders" color={C.amber}/>
        <div className="a-status-grid">
          {[
            { label: 'Pending', key: 'Pending', color: C.amber, icon: '⏳' },
            { label: 'Shipped', key: 'Shipped', color: C.blue, icon: '🚚' },
            { label: 'Delivered', key: 'Delivered', color: C.green, icon: '✅' },
            { label: 'Cancelled', key: 'Cancelled', color: C.red, icon: '❌' },
          ].map((s, i) => (
            <div key={i} className="a-status-card" style={{ borderColor: `${s.color}44` }}>
              <span style={{ fontSize: '1.8rem' }}>{s.icon}</span>
              <p className="a-status-count" style={{ color: s.color }}>
                {statusBreakdown[s.key] || 0}
              </p>
              <p className="a-status-label">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

function AnalyticsLoading() {
  return (
    <div className="analytics-root">
      <div className="a-header">
        <div>
          <div className="a-skeleton" style={{ width: 260, height: 28, marginBottom: 8 }}/>
          <div className="a-skeleton" style={{ width: 200, height: 16 }}/>
        </div>
      </div>
      <div className="a-stats-grid">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="a-stat-card"><Skeleton h={80}/></div>
        ))}
      </div>
      <Card><Skeleton h={280}/></Card>
      <div className="a-two-col">
        <Card><Skeleton h={260}/></Card>
        <Card><Skeleton h={260}/></Card>
      </div>
    </div>
  );
}
