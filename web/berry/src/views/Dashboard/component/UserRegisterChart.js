import PropTypes from 'prop-types';
import { Grid, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import { gridSpacing } from 'store/constant';

const UserRegisterChart = ({ isLoading, chartData }) => {
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
                  <Typography variant="h3">用户注册趋势（近30天）</Typography>
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
  chartData: PropTypes.object
};

export default UserRegisterChart;
