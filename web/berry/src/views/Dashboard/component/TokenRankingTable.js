import PropTypes from 'prop-types';
import {
  Grid,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Skeleton
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

const PERIOD_OPTIONS = [
  { label: '近7天', value: 7 },
  { label: '近30天', value: 30 },
  { label: '近半年', value: 180 }
];

function formatTokens(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K';
  return String(n);
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const TokenRankingTable = ({ isLoading, data, days, onDaysChange }) => {
  const maxTokens = data && data.length > 0 ? data[0].total_tokens : 1;

  return (
    <MainCard>
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="h3">Token 用量排行</Typography>
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
          {isLoading ? (
            <Box>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />
              ))}
            </Box>
          ) : !data || data.length === 0 ? (
            <Box sx={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h3" color="#697586">暂无数据</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 48, fontWeight: 600 }}>排名</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>用户名</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Token 用量</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>占比</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, idx) => {
                  const pct = maxTokens > 0 ? Math.round((row.total_tokens / maxTokens) * 100) : 0;
                  return (
                    <TableRow key={row.username} hover>
                      <TableCell>
                        {idx < 3 ? (
                          <Box
                            sx={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: RANK_COLORS[idx],
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.75rem', color: '#fff'
                            }}
                          >
                            {idx + 1}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ pl: 0.5 }}>{idx + 1}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={row.username} size="small" variant="outlined" sx={{ fontSize: '0.8rem' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{formatTokens(row.total_tokens)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1, height: 8, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden' }}>
                            <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #4318FF, #868CFF)' }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 34 }}>{pct}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Grid>
      </Grid>
    </MainCard>
  );
};

TokenRankingTable.propTypes = {
  isLoading: PropTypes.bool,
  data: PropTypes.array,
  days: PropTypes.number,
  onDaysChange: PropTypes.func
};

export default TokenRankingTable;
