import { useState, useEffect } from 'react';
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
  Skeleton,
  Checkbox,
  FormControlLabel,
  Collapse,
  Button,
  Divider
} from '@mui/material';
import { FilterList, ExpandMore, ExpandLess } from '@mui/icons-material';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { API } from 'utils/api';

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

const TokenRankingTable = ({ isLoading, data, days, onDaysChange, selectedModels, onModelsChange }) => {
  const [modelList, setModelList] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const maxTokens = data && data.length > 0 ? data[0].total_tokens : 1;

  useEffect(() => {
    fetchModelList(days);
  }, [days]);

  const fetchModelList = async (d) => {
    try {
      const res = await API.get(`/api/user/admin/log-models?days=${d}`);
      if (res.data.success) {
        setModelList(res.data.data || []);
      }
    } catch (_) {}
  };

  const allChecked = selectedModels.length === 0;

  const handleToggleModel = (model) => {
    if (selectedModels.includes(model)) {
      const next = selectedModels.filter((m) => m !== model);
      onModelsChange(next);
    } else {
      onModelsChange([...selectedModels, model]);
    }
  };

  const handleSelectAll = () => onModelsChange([]);
  const handleClearAll = () => onModelsChange(modelList.length > 0 ? [...modelList] : []);

  return (
    <MainCard>
      <Grid container spacing={gridSpacing}>
        {/* 标题行 */}
        <Grid item xs={12}>
          <Grid container alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Grid item>
              <Typography variant="h3">Token 用量排行</Typography>
            </Grid>
            <Grid item sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                size="small"
                variant={filterOpen ? 'contained' : 'outlined'}
                startIcon={<FilterList />}
                endIcon={filterOpen ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setFilterOpen((v) => !v)}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                模型筛选
                {selectedModels.length > 0 && (
                  <Chip label={selectedModels.length} size="small" color="primary" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
                )}
              </Button>
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

        {/* 模型筛选面板 */}
        <Grid item xs={12} sx={{ pt: '0 !important' }}>
          <Collapse in={filterOpen}>
            <Box sx={{ p: 1.5, background: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {allChecked ? '当前：全部模型' : `已选 ${selectedModels.length} / ${modelList.length} 个模型`}
                </Typography>
                <Button size="small" sx={{ fontSize: '0.7rem', py: 0, minWidth: 0 }} onClick={handleSelectAll}>全选</Button>
                <Button size="small" sx={{ fontSize: '0.7rem', py: 0, minWidth: 0 }} onClick={handleClearAll}>清除</Button>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {modelList.map((m) => (
                  <FormControlLabel
                    key={m}
                    control={
                      <Checkbox
                        size="small"
                        checked={allChecked || selectedModels.includes(m)}
                        onChange={() => handleToggleModel(m)}
                        sx={{ py: 0.3 }}
                      />
                    }
                    label={<Typography variant="caption">{m}</Typography>}
                    sx={{ mr: 1, mb: 0.5 }}
                  />
                ))}
                {modelList.length === 0 && (
                  <Typography variant="caption" color="text.secondary">暂无模型数据</Typography>
                )}
              </Box>
            </Box>
          </Collapse>
        </Grid>

        {/* 排行表格 */}
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
                          <Box sx={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: RANK_COLORS[idx],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.75rem', color: '#fff'
                          }}>
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
  onDaysChange: PropTypes.func,
  selectedModels: PropTypes.array,
  onModelsChange: PropTypes.func
};

export default TokenRankingTable;
