import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Card, Grid} from 'semantic-ui-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import axios from 'axios';
import { isAdmin } from '../../helpers/utils';
import './Dashboard.css';

// 在 Dashboard 组件内添加自定义配置
const chartConfig = {
  lineChart: {
    style: {
      background: '#fff',
      borderRadius: '8px',
    },
    line: {
      strokeWidth: 2,
      dot: false,
      activeDot: { r: 4 },
    },
    grid: {
      vertical: false,
      horizontal: true,
      opacity: 0.1,
    },
  },
  colors: {
    requests: '#4318FF',
    quota: '#00B5D8',
    tokens: '#6C63FF',
  },
  barColors: [
    '#4318FF', // 深紫色
    '#00B5D8', // 青色
    '#6C63FF', // 紫色
    '#05CD99', // 绿色
    '#FFB547', // 橙色
    '#FF5E7D', // 粉色
    '#41B883', // 翠绿
    '#7983FF', // 淡紫
    '#FF8F6B', // 珊瑚色
    '#49BEFF', // 天蓝
  ],
};

const Dashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    todayRequests: 0,
    todayQuota: 0,
    todayTokens: 0,
  });
  const [registerData, setRegisterData] = useState([]);
  const [registerDays, setRegisterDays] = useState(30);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [tokenRanking, setTokenRanking] = useState([]);
  const [tokenRankingDays, setTokenRankingDays] = useState(30);
  const [tokenRankingLoading, setTokenRankingLoading] = useState(false);
  const [selectedModels, setSelectedModels] = useState([]);
  const [modelList, setModelList] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statsFilterModels, setStatsFilterModels] = useState([]);
  const [statsFilterOpen, setStatsFilterOpen] = useState(false);
  const userIsAdmin = isAdmin();

  useEffect(() => {
    fetchDashboardData();
    if (userIsAdmin) {
      fetchAdminDashboard(30);
      fetchTokenRanking(30, []);
      fetchModelList(30);
    }
  }, []);

  const fetchAdminDashboard = async (days = 30) => {
    setRegisterLoading(true);
    try {
      const res = await axios.get(`/api/user/admin/dashboard?days=${days}`);
      if (res.data.success) {
        setRegisterData(buildRegisterSeries(res.data.data || [], days));
      }
    } catch (_) {}
    setRegisterLoading(false);
  };

  const handleRegisterDaysChange = (days) => {
    setRegisterDays(days);
    fetchAdminDashboard(days);
  };

  const fetchModelList = async (days = 30) => {
    try {
      const res = await axios.get(`/api/user/admin/log-models?days=${days}`);
      if (res.data.success) {
        setModelList(res.data.data || []);
      }
    } catch (_) {}
  };

  const fetchTokenRanking = async (days = 30, models = []) => {
    setTokenRankingLoading(true);
    try {
      const modelsParam = models.length > 0 ? `&models=${encodeURIComponent(models.join(','))}` : '';
      const res = await axios.get(`/api/user/admin/token-ranking?days=${days}&limit=20${modelsParam}`);
      if (res.data.success) {
        setTokenRanking(res.data.data || []);
      }
    } catch (_) {}
    setTokenRankingLoading(false);
  };

  const handleTokenRankingDaysChange = (days) => {
    setTokenRankingDays(days);
    setSelectedModels([]);
    fetchTokenRanking(days, []);
    fetchModelList(days);
  };

  const handleModelsChange = (models) => {
    setSelectedModels(models);
    fetchTokenRanking(tokenRankingDays, models);
  };

  const formatTokens = (n) => {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + ' B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + ' M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K';
    return String(n);
  };

  const buildRegisterSeries = (raw, days = 30) => {
    const map = new Map((raw || []).map((item) => [item.day, item.count]));
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const pad = (n) => String(n).padStart(2, '0');
      const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      result.push({ date: day, count: map.get(day) || 0 });
    }
    return result;
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/user/dashboard');
      if (response.data.success) {
        const dashboardData = response.data.data || [];
        setData(dashboardData);
        calculateSummary(dashboardData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setData([]);
      calculateSummary([]);
    }
  };

  const calculateSummary = (dashboardData) => {
    if (!Array.isArray(dashboardData) || dashboardData.length === 0) {
      setSummaryData({
        todayRequests: 0,
        todayQuota: 0,
        todayTokens: 0,
      });
      return;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const todayData = dashboardData.filter((item) => item.Day === today);

    const summary = {
      todayRequests: todayData.reduce(
        (sum, item) => sum + item.RequestCount,
        0
      ),
      todayQuota:
        todayData.reduce((sum, item) => sum + item.Quota, 0) / 1000000,
      todayTokens: todayData.reduce(
        (sum, item) => sum + item.PromptTokens + item.CompletionTokens,
        0
      ),
    };

    setSummaryData(summary);
  };

  // 处理数据以供折线图使用，补充缺失的日期
  const processTimeSeriesData = (sourceData = data) => {
    const dailyData = {};

    // 获取日期范围
    const dates = sourceData.map((item) => item.Day);
    const maxDate = new Date(); // 总是使用今天作为最后一天
    let minDate =
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => new Date(d))))
        : new Date();

    // 确保至少显示7天的数据
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6是因为包含今天
    if (minDate > sevenDaysAgo) {
      minDate = sevenDaysAgo;
    }

    // 生成所有日期 (use local date to match MySQL server timezone)
    const localDateStr = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateStr = localDateStr(d);
      dailyData[dateStr] = {
        date: dateStr,
        requests: 0,
        quota: 0,
        tokens: 0,
      };
    }

    // 填充实际数据
    sourceData.forEach((item) => {
      if (!dailyData[item.Day]) return;
      dailyData[item.Day].requests += item.RequestCount;
      dailyData[item.Day].quota += item.Quota / 1000000;
      dailyData[item.Day].tokens += item.PromptTokens + item.CompletionTokens;
    });

    return Object.values(dailyData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  };

  // 处理数据以供堆叠柱状图使用
  const processModelData = (sourceData = data) => {
    const timeData = {};

    // 获取日期范围
    const dates = sourceData.map((item) => item.Day);
    const maxDate = new Date(); // 总是使用今天作为最后一天
    let minDate =
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => new Date(d))))
        : new Date();

    // 确保至少显示7天的数据
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6是因为包含今天
    if (minDate > sevenDaysAgo) {
      minDate = sevenDaysAgo;
    }

    // 生成所有日期 (use local date to match MySQL server timezone)
    const localDateStr2 = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateStr = localDateStr2(d);
      timeData[dateStr] = {
        date: dateStr,
      };

      // 初始化所有模型的数据为0
      const allModels = [...new Set(sourceData.map((item) => item.ModelName))];
      allModels.forEach((model) => {
        timeData[dateStr][model] = 0;
      });
    }

    // 填充实际数据
    sourceData.forEach((item) => {
      if (!timeData[item.Day]) return;
      timeData[item.Day][item.ModelName] =
        item.PromptTokens + item.CompletionTokens;
    });

    return Object.values(timeData).sort((a, b) => a.date.localeCompare(b.date));
  };

  // 获取所有唯一的模型名称
  const getUniqueModels = (sourceData = data) => {
    return [...new Set(sourceData.map((item) => item.ModelName))];
  };

  const filteredDashboardData = statsFilterModels.length > 0
    ? data.filter((item) => statsFilterModels.includes(item.ModelName))
    : data;
  const availableStatsModels = [...new Set(data.map((item) => item.ModelName).filter(Boolean))].sort();

  const timeSeriesData = processTimeSeriesData(filteredDashboardData);
  const modelData = processModelData(filteredDashboardData);
  const models = getUniqueModels(filteredDashboardData);
  const filteredSummary = (() => {
    if (!Array.isArray(filteredDashboardData) || filteredDashboardData.length === 0) return { todayRequests: 0, todayQuota: 0, todayTokens: 0 };
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const todayData = filteredDashboardData.filter((item) => item.Day === today);
    return {
      todayRequests: todayData.reduce((sum, item) => sum + item.RequestCount, 0),
      todayQuota: todayData.reduce((sum, item) => sum + item.Quota, 0) / 1000000,
      todayTokens: todayData.reduce((sum, item) => sum + item.PromptTokens + item.CompletionTokens, 0),
    };
  })();

  // 生成随机颜色
  const getRandomColor = (index) => {
    return chartConfig.barColors[index % chartConfig.barColors.length];
  };

  // 添加一个日期格式化函数
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  // 修改所有 XAxis 配置
  const xAxisConfig = {
    dataKey: 'date',
    axisLine: false,
    tickLine: false,
    tick: {
      fontSize: 12,
      fill: '#A3AED0',
      textAnchor: 'middle', // 文本居中对齐
    },
    tickFormatter: formatDate,
    interval: 0,
    minTickGap: 5,
    padding: { left: 30, right: 30 }, // 增加两侧的内边距，确保首尾标签完整显示
  };

  return (
    <div className='dashboard-container'>
      {/* 模型筛选条 */}
      {availableStatsModels.length > 0 && (
        <div style={{ marginBottom: '12px', padding: '12px 16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setStatsFilterOpen((v) => !v)}
              style={{
                padding: '4px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                border: '1px solid', borderColor: statsFilterOpen ? '#4318FF' : '#e2e8f0',
                background: statsFilterOpen ? '#4318FF' : '#fff', color: statsFilterOpen ? '#fff' : '#4a5568',
                fontWeight: 600, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ☰ 按模型筛选统计 {statsFilterModels.length > 0 && `(已选 ${statsFilterModels.length})`}
            </button>
            {statsFilterModels.length > 0 ? (
              <>
                {statsFilterModels.map((m) => (
                  <span key={m} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: '12px', background: '#f0edff',
                    border: '1px solid #4318FF', color: '#4318FF', fontSize: '12px'
                  }}>
                    {m}
                    <span style={{ cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => setStatsFilterModels(statsFilterModels.filter((x) => x !== m))
                        || setStatsFilterModels((prev) => { const n = prev.filter((x) => x !== m); /* trigger rerender */ return n; })}>×</span>
                  </span>
                ))}
                <button onClick={() => setStatsFilterModels([])}
                  style={{ fontSize: '11px', border: 'none', background: 'none', color: '#718096', cursor: 'pointer' }}>清除全部</button>
              </>
            ) : (
              <span style={{ fontSize: '12px', color: '#A3AED0' }}>当前统计全部模型</span>
            )}
          </div>
          {statsFilterOpen && (
            <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <button onClick={() => setStatsFilterModels([])}
                  style={{ fontSize: '11px', border: 'none', background: 'none', color: '#4318FF', cursor: 'pointer' }}>全选</button>
                <button onClick={() => setStatsFilterModels([...availableStatsModels])}
                  style={{ fontSize: '11px', border: 'none', background: 'none', color: '#718096', cursor: 'pointer' }}>清除</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {availableStatsModels.map((m) => {
                  const checked = statsFilterModels.length === 0 || statsFilterModels.includes(m);
                  return (
                    <label key={m} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                      borderRadius: '12px', border: '1px solid', cursor: 'pointer',
                      borderColor: checked ? '#4318FF' : '#e2e8f0',
                      background: checked ? '#f0edff' : '#fff', color: checked ? '#4318FF' : '#718096', fontSize: '12px'
                    }}>
                      <input type='checkbox' checked={checked} style={{ margin: 0, width: 12, height: 12 }}
                        onChange={() => {
                          if (statsFilterModels.length === 0) setStatsFilterModels(availableStatsModels.filter((x) => x !== m));
                          else if (statsFilterModels.includes(m)) setStatsFilterModels(statsFilterModels.filter((x) => x !== m));
                          else setStatsFilterModels([...statsFilterModels, m]);
                        }} />
                      {m}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 用户注册趋势（仅管理员可见） */}
      {userIsAdmin && (
        <Card fluid className='chart-card'>
          <Card.Content>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <Card.Header>用户注册趋势</Card.Header>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[7, 14, 30, 90, 180].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleRegisterDaysChange(d)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      border: '1px solid',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      borderColor: registerDays === d ? '#4318FF' : '#e2e8f0',
                      background: registerDays === d ? '#4318FF' : '#fff',
                      color: registerDays === d ? '#fff' : '#4a5568',
                      fontWeight: registerDays === d ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {d === 180 ? '近半年' : `近${d}天`}
                  </button>
                ))}
              </div>
            </div>
            <div className='chart-container'>
              {registerLoading ? (
                <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A3AED0' }}>加载中...</div>
              ) : (
              <ResponsiveContainer width='100%' height={260}>
                <AreaChart data={registerData}>
                  <defs>
                    <linearGradient id='regGrad' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#4318FF' stopOpacity={0.3} />
                      <stop offset='95%' stopColor='#4318FF' stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} opacity={0.1} />
                  <XAxis
                    dataKey='date'
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#A3AED0' }}
                    tickFormatter={formatDate}
                    interval={4}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#A3AED0' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: 'none', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [value + ' 人', '注册人数']}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Area
                    type='monotone'
                    dataKey='count'
                    stroke='#4318FF'
                    strokeWidth={2}
                    fill='url(#regGrad)'
                    dot={false}
                    activeDot={{ r: 4 }}
                    name='注册人数'
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* 三个并排的折线图 */}
      <Grid columns={3} stackable className='charts-grid'>
        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>
                {t('dashboard.charts.requests.title')}
                {/* <span className='stat-value'>{summaryData.todayRequests}</span> */}
              </Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer
                  width='100%'
                  height={120}
                  margin={{ left: 10, right: 10 }} // 调整容器边距
                >
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={chartConfig.lineChart.grid.vertical}
                      horizontal={chartConfig.lineChart.grid.horizontal}
                      opacity={chartConfig.lineChart.grid.opacity}
                    />
                    <XAxis {...xAxisConfig} />
                    <YAxis hide={true} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [
                        value,
                        t('dashboard.charts.requests.tooltip'),
                      ]}
                      labelFormatter={(label) =>
                        `${t(
                          'dashboard.statistics.tooltip.date'
                        )}: ${formatDate(label)}`
                      }
                    />
                    <Line
                      type='monotone'
                      dataKey='requests'
                      stroke={chartConfig.colors.requests}
                      strokeWidth={chartConfig.lineChart.line.strokeWidth}
                      dot={chartConfig.lineChart.line.dot}
                      activeDot={chartConfig.lineChart.line.activeDot}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>

        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>
                {t('dashboard.charts.quota.title')}
                {/* <span className='stat-value'>
                  ${summaryData.todayQuota.toFixed(3)}
                </span> */}
              </Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer
                  width='100%'
                  height={120}
                  margin={{ left: 10, right: 10 }} // 调整容器边距
                >
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={chartConfig.lineChart.grid.vertical}
                      horizontal={chartConfig.lineChart.grid.horizontal}
                      opacity={chartConfig.lineChart.grid.opacity}
                    />
                    <XAxis {...xAxisConfig} />
                    <YAxis hide={true} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [
                        value.toFixed(6),
                        t('dashboard.charts.quota.tooltip'),
                      ]}
                      labelFormatter={(label) =>
                        `${t(
                          'dashboard.statistics.tooltip.date'
                        )}: ${formatDate(label)}`
                      }
                    />
                    <Line
                      type='monotone'
                      dataKey='quota'
                      stroke={chartConfig.colors.quota}
                      strokeWidth={chartConfig.lineChart.line.strokeWidth}
                      dot={chartConfig.lineChart.line.dot}
                      activeDot={chartConfig.lineChart.line.activeDot}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>

        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>
                {t('dashboard.charts.tokens.title')}
                {/* <span className='stat-value'>{summaryData.todayTokens}</span> */}
              </Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer
                  width='100%'
                  height={120}
                  margin={{ left: 10, right: 10 }} // 调整容器边距
                >
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={chartConfig.lineChart.grid.vertical}
                      horizontal={chartConfig.lineChart.grid.horizontal}
                      opacity={chartConfig.lineChart.grid.opacity}
                    />
                    <XAxis {...xAxisConfig} />
                    <YAxis hide={true} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [
                        value,
                        t('dashboard.charts.tokens.tooltip'),
                      ]}
                      labelFormatter={(label) =>
                        `${t(
                          'dashboard.statistics.tooltip.date'
                        )}: ${formatDate(label)}`
                      }
                    />
                    <Line
                      type='monotone'
                      dataKey='tokens'
                      stroke={chartConfig.colors.tokens}
                      strokeWidth={chartConfig.lineChart.line.strokeWidth}
                      dot={chartConfig.lineChart.line.dot}
                      activeDot={chartConfig.lineChart.line.activeDot}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>
      </Grid>

      {/* 模型使用统计 */}
      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header>{t('dashboard.statistics.title')}</Card.Header>
          <div className='chart-container'>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={modelData}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  opacity={0.1}
                />
                <XAxis {...xAxisConfig} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#A3AED0' }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  labelFormatter={(label) =>
                    `${t('dashboard.statistics.tooltip.date')}: ${formatDate(
                      label
                    )}`
                  }
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '20px',
                  }}
                />
                {models.map((model, index) => (
                  <Bar
                    key={model}
                    dataKey={model}
                    stackId='a'
                    fill={getRandomColor(index)}
                    name={model}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card.Content>
      </Card>

      {/* Token 用量排行（仅管理员可见） */}
      {userIsAdmin && (
        <Card fluid className='chart-card'>
          <Card.Content>
            {/* 标题 + 时间段按钮 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <Card.Header>Token 用量排行</Card.Header>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  style={{
                    padding: '4px 10px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                    border: '1px solid', borderColor: filterOpen ? '#4318FF' : '#e2e8f0',
                    background: filterOpen ? '#4318FF' : '#fff', color: filterOpen ? '#fff' : '#4a5568',
                    fontWeight: filterOpen ? 600 : 400, transition: 'all 0.15s',
                  }}
                >
                  模型筛选 {selectedModels.length > 0 && `(${selectedModels.length})`}
                </button>
                {[7, 30, 180].map((d) => (
                  <button key={d} onClick={() => handleTokenRankingDaysChange(d)}
                    style={{
                      padding: '4px 10px', fontSize: '12px', border: '1px solid', borderRadius: '6px', cursor: 'pointer',
                      borderColor: tokenRankingDays === d ? '#4318FF' : '#e2e8f0',
                      background: tokenRankingDays === d ? '#4318FF' : '#fff',
                      color: tokenRankingDays === d ? '#fff' : '#4a5568',
                      fontWeight: tokenRankingDays === d ? 600 : 400, transition: 'all 0.15s',
                    }}
                  >
                    {d === 180 ? '近半年' : `近${d}天`}
                  </button>
                ))}
              </div>
            </div>

            {/* 模型筛选面板 */}
            {filterOpen && (
              <div style={{ marginTop: '10px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', color: '#718096' }}>
                  <span>{selectedModels.length === 0 ? '当前：全部模型' : `已选 ${selectedModels.length} / ${modelList.length} 个模型`}</span>
                  <button onClick={() => handleModelsChange([])} style={{ fontSize: '11px', border: 'none', background: 'none', color: '#4318FF', cursor: 'pointer', padding: '0 4px' }}>全选</button>
                  <button onClick={() => handleModelsChange([...modelList])} style={{ fontSize: '11px', border: 'none', background: 'none', color: '#718096', cursor: 'pointer', padding: '0 4px' }}>清除</button>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {modelList.map((m) => {
                    const checked = selectedModels.length === 0 || selectedModels.includes(m);
                    return (
                      <label key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer',
                        padding: '3px 8px', borderRadius: '12px', border: '1px solid',
                        borderColor: checked ? '#4318FF' : '#e2e8f0',
                        background: checked ? '#f0edff' : '#fff', color: checked ? '#4318FF' : '#718096',
                      }}>
                        <input type='checkbox' checked={checked}
                          onChange={() => {
                            if (selectedModels.length === 0) {
                              handleModelsChange(modelList.filter((x) => x !== m));
                            } else if (selectedModels.includes(m)) {
                              handleModelsChange(selectedModels.filter((x) => x !== m));
                            } else {
                              handleModelsChange([...selectedModels, m]);
                            }
                          }}
                          style={{ margin: 0, width: 12, height: 12 }}
                        />
                        {m}
                      </label>
                    );
                  })}
                  {modelList.length === 0 && <span style={{ fontSize: '12px', color: '#A3AED0' }}>暂无模型数据</span>}
                </div>
              </div>
            )}

            {/* 排行表格 */}
            <div style={{ marginTop: '12px' }}>
              {tokenRankingLoading ? (
                <div style={{ minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A3AED0' }}>加载中...</div>
              ) : tokenRanking.length === 0 ? (
                <div style={{ minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A3AED0' }}>暂无数据</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 4px', width: 48, color: '#2B3674', fontWeight: 600 }}>排名</th>
                      <th style={{ textAlign: 'left', padding: '8px 4px', color: '#2B3674', fontWeight: 600 }}>用户名</th>
                      <th style={{ textAlign: 'right', padding: '8px 4px', color: '#2B3674', fontWeight: 600 }}>Token 用量</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#2B3674', fontWeight: 600, minWidth: 140 }}>占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenRanking.map((row, idx) => {
                      const maxT = tokenRanking[0].total_tokens || 1;
                      const pct = Math.round((row.total_tokens / maxT) * 100);
                      const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                      return (
                        <tr key={row.username} style={{ borderBottom: '1px solid #f7f7f7' }}>
                          <td style={{ padding: '10px 4px' }}>
                            {idx < 3 ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 22, height: 22, borderRadius: '50%',
                                background: rankColors[idx], color: '#fff', fontSize: '11px', fontWeight: 700
                              }}>{idx + 1}</span>
                            ) : (
                              <span style={{ color: '#A3AED0', paddingLeft: 4 }}>{idx + 1}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 4px' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 10px',
                              borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#2B3674'
                            }}>{row.username}</span>
                          </td>
                          <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600, color: '#2B3674' }}>
                            {formatTokens(row.total_tokens)}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #4318FF, #868CFF)' }} />
                              </div>
                              <span style={{ fontSize: '12px', color: '#A3AED0', minWidth: 34 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
