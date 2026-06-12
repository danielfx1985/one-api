import { useEffect, useState } from 'react';
import { Grid, Typography } from '@mui/material';
import { gridSpacing } from 'store/constant';
import StatisticalLineChartCard from './component/StatisticalLineChartCard';
import StatisticalBarChart from './component/StatisticalBarChart';
import UserRegisterChart from './component/UserRegisterChart';
import { generateChartOptions, getLastSevenDays } from 'utils/chart';
import { API } from 'utils/api';
import { showError, calculateQuota, renderNumber, isAdmin } from 'utils/common';
import UserCard from 'ui-component/cards/UserCard';

const Dashboard = () => {
  const [isLoading, setLoading] = useState(true);
  const [statisticalData, setStatisticalData] = useState([]);
  const [requestChart, setRequestChart] = useState(null);
  const [quotaChart, setQuotaChart] = useState(null);
  const [tokenChart, setTokenChart] = useState(null);
  const [users, setUsers] = useState([]);
  const [registerChart, setRegisterChart] = useState(null);
  const [registerDays, setRegisterDays] = useState(30);
  const [registerLoading, setRegisterLoading] = useState(false);
  const userIsAdmin = isAdmin();

  const userDashboard = async () => {
    const res = await API.get('/api/user/dashboard');
    const { success, message, data } = res.data;
    if (success) {
      if (data) {
        let lineData = getLineDataGroup(data);
        setRequestChart(getLineCardOption(lineData, 'RequestCount'));
        setQuotaChart(getLineCardOption(lineData, 'Quota'));
        setTokenChart(getLineCardOption(lineData, 'PromptTokens'));
        setStatisticalData(getBarDataGroup(data));
      }
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const adminDashboard = async (days = 30) => {
    setRegisterLoading(true);
    try {
      const res = await API.get(`/api/user/admin/dashboard?days=${days}`);
      const { success, message, data } = res.data;
      if (success) {
        setRegisterChart(getRegisterChartOption(data || [], days));
      } else {
        showError(message || '获取注册统计失败');
      }
    } catch (e) {
      showError('获取注册统计失败: ' + e.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRegisterDaysChange = (days) => {
    setRegisterDays(days);
    adminDashboard(days);
  };

  const loadUser = async () => {
    let res = await API.get(`/api/user/self`);
    const { success, message, data } = res.data;
    if (success) {
      setUsers(data);
    } else {
      showError(message);
    }
  };

  useEffect(() => {
    userDashboard();
    loadUser();
    if (userIsAdmin) {
      adminDashboard(registerDays);
    }
  }, []);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item lg={4} xs={12}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title="今日请求量"
              chartData={requestChart?.chartData}
              todayValue={requestChart?.todayValue}
            />
          </Grid>
          <Grid item lg={4} xs={12}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title="今日消费"
              chartData={quotaChart?.chartData}
              todayValue={quotaChart?.todayValue}
            />
          </Grid>
          <Grid item lg={4} xs={12}>
            <StatisticalLineChartCard
              isLoading={isLoading}
              title="今日 token"
              chartData={tokenChart?.chartData}
              todayValue={tokenChart?.todayValue}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item lg={8} xs={12}>
            <StatisticalBarChart isLoading={isLoading} chartDatas={statisticalData} />
          </Grid>
          <Grid item lg={4} xs={12}>
            <UserCard>
              <Grid container spacing={gridSpacing} justifyContent="center" alignItems="center" paddingTop={'20px'}>
                <Grid item xs={4}>
                  <Typography variant="h4">余额：</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="h3"> {users?.quota ? '$' + calculateQuota(users.quota) : '未知'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4">已使用：</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="h3"> {users?.used_quota ? '$' + calculateQuota(users.used_quota) : '未知'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4">调用次数：</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="h3"> {users?.request_count || '未知'}</Typography>
                </Grid>
              </Grid>
            </UserCard>
          </Grid>
        </Grid>
      </Grid>
      {userIsAdmin && (
        <Grid item xs={12}>
          <UserRegisterChart
            isLoading={registerLoading}
            chartData={registerChart}
            days={registerDays}
            onDaysChange={handleRegisterDaysChange}
          />
        </Grid>
      )}
    </Grid>
  );
};
export default Dashboard;

function getLineDataGroup(statisticalData) {
  let groupedData = statisticalData.reduce((acc, cur) => {
    if (!acc[cur.Day]) {
      acc[cur.Day] = {
        date: cur.Day,
        RequestCount: 0,
        Quota: 0,
        PromptTokens: 0,
        CompletionTokens: 0
      };
    }
    acc[cur.Day].RequestCount += cur.RequestCount;
    acc[cur.Day].Quota += cur.Quota;
    acc[cur.Day].PromptTokens += cur.PromptTokens;
    acc[cur.Day].CompletionTokens += cur.CompletionTokens;
    return acc;
  }, {});
  let lastSevenDays = getLastSevenDays();
  return lastSevenDays.map((day) => {
    if (!groupedData[day]) {
      return {
        date: day,
        RequestCount: 0,
        Quota: 0,
        PromptTokens: 0,
        CompletionTokens: 0
      };
    } else {
      return groupedData[day];
    }
  });
}

function getBarDataGroup(data) {
  const lastSevenDays = getLastSevenDays();
  const result = [];
  const map = new Map();

  for (const item of data) {
    if (!map.has(item.ModelName)) {
      const newData = { name: item.ModelName, data: new Array(7) };
      map.set(item.ModelName, newData);
      result.push(newData);
    }
    const index = lastSevenDays.indexOf(item.Day);
    if (index !== -1) {
      map.get(item.ModelName).data[index] = calculateQuota(item.Quota, 3);
    }
  }

  for (const item of result) {
    for (let i = 0; i < 7; i++) {
      if (item.data[i] === undefined) {
        item.data[i] = 0;
      }
    }
  }

  return { data: result, xaxis: lastSevenDays };
}

function getLineCardOption(lineDataGroup, field) {
  let todayValue = 0;
  let chartData = null;
  const lastItem = lineDataGroup.length - 1;
  let lineData = lineDataGroup.map((item, index) => {
    let tmp = {
      date: item.date,
      value: item[field]
    };
    switch (field) {
      case 'Quota':
        tmp.value = calculateQuota(item.Quota, 3);
        break;
      case 'PromptTokens':
        tmp.value += item.CompletionTokens;
        break;
    }

    if (index == lastItem) {
      todayValue = tmp.value;
    }
    return tmp;
  });

  switch (field) {
    case 'RequestCount':
      chartData = generateChartOptions(lineData, '次');
      todayValue = renderNumber(todayValue);
      break;
    case 'Quota':
      chartData = generateChartOptions(lineData, '美元');
      todayValue = '$' + renderNumber(todayValue);
      break;
    case 'PromptTokens':
      chartData = generateChartOptions(lineData, '');
      todayValue = renderNumber(todayValue);
      break;
  }

  return { chartData: chartData, todayValue: todayValue };
}

function getRegisterChartOption(data, days = 30) {
  const dateMap = new Map(data.map((item) => [item.day, item.count]));
  const dates = [];
  const counts = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Use local date to match MySQL server timezone (not UTC)
    const pad = (n) => String(n).padStart(2, '0');
    const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    dates.push(day);
    counts.push(dateMap.get(day) || 0);
  }
  return {
    height: 320,
    type: 'area',
    series: [{ name: '注册人数', data: counts }],
    options: {
      chart: { toolbar: { show: false }, zoom: { enabled: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#4318FF'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      xaxis: {
        categories: dates,
        labels: { rotate: -45, style: { fontSize: '10px' }, hideOverlappingLabels: false },
        tickPlacement: 'on'
      },
      yaxis: { min: 0, tickAmount: 4, labels: { formatter: (v) => Math.floor(v) } },
      tooltip: { theme: 'dark', x: { formatter: (_, { dataPointIndex }) => dates[dataPointIndex] }, y: { formatter: (v) => v + ' 人' } },
      grid: { borderColor: '#e0e0e0' }
    }
  };
}
