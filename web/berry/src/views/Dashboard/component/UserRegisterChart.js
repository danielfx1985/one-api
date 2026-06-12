import PropTypes from 'prop-types';
import { Grid, Typography, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import Chart from 'react-apexcharts';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import { gridSpacing } from 'store/constant';

const PERIOD_OPTIONS = [
  { label: '近7天', value: 7 },
  { label: '近14天', value: 14 },
  { label: '近30天', value: 30 },
  { label: '近90天', value: 90 },
  { label: '近半年', value: 180 }
];

const UserRegisterChart = ({ isLoading, chartData, days, onDaysChange }) => {
  return (
    <>
      {isLoading ? (
        <SkeletonTotalGrowthBarChart />
      ) : (
        <MainCard>
          <Grid container spacing={gridSpacing}>
            <Grid item xs={12}>
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <Typography variant="h3">用户注册趋势</Typography>
                </Grid>
                <Grid item>
                  <ToggleButtonGroup
                    value={days}
                    exclusive
                    onChange={(_, val) => val && onDaysChange(val)}
                    size="small"
                  >
                    {PERIOD_OPTIONS.map((opt) => (
                      <ToggleButton key={opt.value} value={opt.value} sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
                        {opt.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              {chartData?.series?.[0]?.data?.some((v) => v > 0) ? (
                <Chart {...chartData} />
              ) : (
                <Box sx={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h3" color="#697586">
                    暂无数据
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </MainCard>
      )}
    </>
  );
};

UserRegisterChart.propTypes = {
  isLoading: PropTypes.bool,
  chartData: PropTypes.object,
  days: PropTypes.number,
  onDaysChange: PropTypes.func
};

export default UserRegisterChart;
