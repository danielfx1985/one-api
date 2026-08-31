import { useState, useEffect } from 'react';
import SubCard from 'ui-component/cards/SubCard';
import {
    Stack,
    FormControl,
    FormLabel,
    FormControlLabel,
    InputLabel,
    OutlinedInput,
    Button,
    Alert,
    TextField,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    Divider,
    Link,
    Radio,
    RadioGroup
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { showError, showSuccess } from 'utils/common'; //,
import { API } from 'utils/api';
import { marked } from 'marked';

const OtherSetting = () => {
  let [inputs, setInputs] = useState({
    Footer: '',
    Notice: '',
    About: '',
    SystemName: '',
    Logo: '',
    HomePageContent: '',
    Theme: '',
  });
  let [loading, setLoading] = useState(false);
  const [broadcast, setBroadcast] = useState({
    subject: '',
    content: '',
    test_email: '',
    id_ranges: '',
    exclude_ids: '',
    audience: 'all'
  });
  const [broadcastMeta, setBroadcastMeta] = useState({
    recipient_count: 0,
    smtp_configured: false,
    sending: false
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    tag_name: '',
    content: ''
  });

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
        if (item.key in inputs) {
          newInputs[item.key] = item.value;
        }
      });
      setInputs(newInputs);
    } else {
      showError(message);
    }
  };

  const broadcastFilterParams = () => ({
    id_ranges: broadcast.id_ranges,
    exclude_ids: broadcast.exclude_ids,
    audience: broadcast.audience || 'all'
  });

  const loadBroadcastMeta = async () => {
    const res = await API.get('/api/user/admin/broadcast-email', {
      params: broadcastFilterParams()
    });
    const { success, message, data } = res.data;
    if (success) {
      setBroadcastMeta({
        recipient_count: data.recipient_count || 0,
        smtp_configured: !!data.smtp_configured,
        sending: !!data.sending
      });
    } else {
      showError(message);
    }
  };

  useEffect(() => {
    getOptions().then();
    loadBroadcastMeta().then();
  }, []);

  const handleBroadcastChange = (event) => {
    const { name, value } = event.target;
    setBroadcast((prev) => ({ ...prev, [name]: value }));
  };

  const submitBroadcast = async (testOnly) => {
    if (!broadcast.subject.trim() || !broadcast.content.trim()) {
      showError('主题和正文不能为空');
      return;
    }
    if (testOnly && !broadcast.test_email.trim()) {
      showError('请先填写试发邮箱');
      return;
    }
    if (
      !testOnly &&
      !window.confirm(`确认向当前筛选的 ${broadcastMeta.recipient_count} 个邮箱群发这封邮件？发送后无法撤回。`)
    ) {
      return;
    }
    setBroadcastLoading(true);
    try {
      const res = await API.post('/api/user/admin/broadcast-email', {
        subject: broadcast.subject,
        content: broadcast.content,
        test_email: testOnly ? broadcast.test_email : '',
        ...broadcastFilterParams()
      });
      const { success, message, data } = res.data;
      if (success) {
        if (testOnly) {
          showSuccess(message);
        } else {
          showSuccess(`已开始向 ${data?.recipient_count ?? broadcastMeta.recipient_count} 个邮箱发送`);
          setBroadcastMeta((prev) => ({ ...prev, sending: true }));
        }
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message || '请求失败');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const updateOption = async (key, value) => {
    setLoading(true);
    const res = await API.put('/api/option/', {
      key,
      value
    });
    const { success, message } = res.data;
    if (success) {
      setInputs((inputs) => ({ ...inputs, [key]: value }));
      showSuccess('保存成功');
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const handleInputChange = async (event) => {
    let { name, value } = event.target;
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };

  const submitNotice = async () => {
    await updateOption('Notice', inputs.Notice);
  };

  const submitFooter = async () => {
    await updateOption('Footer', inputs.Footer);
  };

  const submitSystemName = async () => {
    await updateOption('SystemName', inputs.SystemName);
  };

  const submitTheme = async () => {
    await updateOption('Theme', inputs.Theme);
  };

  const submitLogo = async () => {
    await updateOption('Logo', inputs.Logo);
  };

  const submitAbout = async () => {
    await updateOption('About', inputs.About);
  };

  const submitOption = async (key) => {
    await updateOption(key, inputs[key]);
  };

  const openGitHubRelease = () => {
    window.location = 'https://github.com/songquanpeng/one-api/releases/latest';
  };

  const checkUpdate = async () => {
    const res = await API.get('https://api.github.com/repos/songquanpeng/one-api/releases/latest');
    const { tag_name, body } = res.data;
    if (tag_name === process.env.REACT_APP_VERSION) {
      showSuccess(`已是最新版本：${tag_name}`);
    } else {
      setUpdateData({
        tag_name: tag_name,
        content: marked.parse(body)
      });
      setShowUpdateModal(true);
    }
  };

  return (
    <>
      <Stack spacing={2}>
        <SubCard title="通用设置">
          <Grid container spacing={{ xs: 3, sm: 2, md: 4 }}>
            <Grid xs={12}>
              <Button variant="contained" onClick={checkUpdate}>
                检查更新
              </Button>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <TextField
                  multiline
                  maxRows={15}
                  id="Notice"
                  label="公告"
                  value={inputs.Notice}
                  name="Notice"
                  onChange={handleInputChange}
                  minRows={10}
                  placeholder="在此输入新的公告内容，支持 Markdown & HTML 代码"
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <Button variant="contained" onClick={submitNotice}>
                保存公告
              </Button>
            </Grid>
          </Grid>
        </SubCard>
        <SubCard title="群发邮件">
          <Grid container spacing={{ xs: 3, sm: 2, md: 4 }}>
            <Grid xs={12}>
              <Alert severity="info">
                按下方筛选向未删除用户的真实邮箱逐封发送，自动跳过空邮箱和手机占位邮箱。号段与排除 ID 留空表示不限制。请先在系统设置中配置 SMTP。
                当前筛选可发送 {broadcastMeta.recipient_count} 个邮箱。
              </Alert>
            </Grid>
            {!broadcastMeta.smtp_configured && (
              <Grid xs={12}>
                <Alert severity="warning">尚未配置 SMTP，群发前请先填写邮件服务器。</Alert>
              </Grid>
            )}
            {broadcastMeta.sending && (
              <Grid xs={12}>
                <Alert severity="warning">正在发送中，请稍候。</Alert>
              </Grid>
            )}
            <Grid xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel htmlFor="broadcast-id-ranges">用户 ID 号段</InputLabel>
                <OutlinedInput
                  id="broadcast-id-ranges"
                  name="id_ranges"
                  value={broadcast.id_ranges}
                  onChange={handleBroadcastChange}
                  label="用户 ID 号段"
                  placeholder="例如：1-100, 200-350；留空表示全部"
                  disabled={broadcastLoading}
                />
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel htmlFor="broadcast-exclude-ids">排除 ID</InputLabel>
                <OutlinedInput
                  id="broadcast-exclude-ids"
                  name="exclude_ids"
                  value={broadcast.exclude_ids}
                  onChange={handleBroadcastChange}
                  label="排除 ID"
                  placeholder="例如：15, 88, 201-210"
                  disabled={broadcastLoading}
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <FormControl>
                <FormLabel>发送对象</FormLabel>
                <RadioGroup
                  row
                  name="audience"
                  value={broadcast.audience}
                  onChange={handleBroadcastChange}
                >
                  <FormControlLabel value="all" control={<Radio />} label="全部用户" disabled={broadcastLoading} />
                  <FormControlLabel value="vip" control={<Radio />} label="仅 VIP" disabled={broadcastLoading} />
                  <FormControlLabel value="non_vip" control={<Radio />} label="仅非 VIP" disabled={broadcastLoading} />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <InputLabel htmlFor="broadcast-subject">邮件主题</InputLabel>
                <OutlinedInput
                  id="broadcast-subject"
                  name="subject"
                  value={broadcast.subject}
                  onChange={handleBroadcastChange}
                  label="邮件主题"
                  placeholder="请输入邮件主题"
                  disabled={broadcastLoading}
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <TextField
                  multiline
                  maxRows={15}
                  id="broadcast-content"
                  label="邮件正文"
                  value={broadcast.content}
                  name="content"
                  onChange={handleBroadcastChange}
                  minRows={8}
                  placeholder="支持 HTML，例如：<p>您好，这是一封系统通知。</p>"
                  disabled={broadcastLoading}
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <InputLabel htmlFor="broadcast-test-email">试发邮箱</InputLabel>
                <OutlinedInput
                  id="broadcast-test-email"
                  name="test_email"
                  value={broadcast.test_email}
                  onChange={handleBroadcastChange}
                  label="试发邮箱"
                  placeholder="先发一封到自己的邮箱确认效果"
                  disabled={broadcastLoading}
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <Stack direction="row" spacing={2}>
                <Button variant="outlined" onClick={loadBroadcastMeta} disabled={broadcastLoading}>
                  刷新人数
                </Button>
                <Button variant="outlined" onClick={() => submitBroadcast(true)} disabled={broadcastLoading}>
                  发送测试邮件
                </Button>
                <Button
                  variant="contained"
                  onClick={() => submitBroadcast(false)}
                  disabled={broadcastLoading || broadcastMeta.sending}
                >
                  按筛选群发
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </SubCard>
        <SubCard title="个性化设置">
          <Grid container spacing={{ xs: 3, sm: 2, md: 4 }}>
            <Grid xs={12}>
              <FormControl fullWidth>
                <InputLabel htmlFor="SystemName">系统名称</InputLabel>
                <OutlinedInput
                  id="SystemName"
                  name="SystemName"
                  value={inputs.SystemName || ''}
                  onChange={handleInputChange}
                  label="系统名称"
                  placeholder="在此输入系统名称"
                  disabled={loading}
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <Button variant="contained" onClick={submitSystemName}>
                设置系统名称
              </Button>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <InputLabel htmlFor="Theme">主题名称</InputLabel>
                <OutlinedInput
                    id="Theme"
                    name="Theme"
                    value={inputs.Theme || ''}
                    onChange={handleInputChange}
                    label="主题名称"
                    placeholder="请输入主题名称"
                    disabled={loading}
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <Button variant="contained" onClick={submitTheme}>
                设置主题（重启生效）
              </Button>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <InputLabel htmlFor="Logo">Logo 图片地址</InputLabel>
                <OutlinedInput
                  id="Logo"
                  name="Logo"
                  value={inputs.Logo || ''}
                  onChange={handleInputChange}
                  label="Logo 图片地址"
                  placeholder="在此输入Logo 图片地址"
                  disabled={loading}
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <Button variant="contained" onClick={submitLogo}>
                设置 Logo
              </Button>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <TextField
                  multiline
                  maxRows={15}
                  id="HomePageContent"
                  label="首页内容"
                  value={inputs.HomePageContent}
                  name="HomePageContent"
                  onChange={handleInputChange}
                  minRows={10}
                  placeholder="在此输入首页内容，支持 Markdown & HTML 代码，设置后首页的状态信息将不再显示。如果输入的是一个链接，则会使用该链接作为 iframe 的 src 属性，这允许你设置任意网页作为首页。"
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <Button variant="contained" onClick={() => submitOption('HomePageContent')}>
                保存首页内容
              </Button>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <TextField
                  multiline
                  maxRows={15}
                  id="About"
                  label="关于"
                  value={inputs.About}
                  name="About"
                  onChange={handleInputChange}
                  minRows={10}
                  placeholder="在此输入新的关于内容，支持 Markdown & HTML 代码。如果输入的是一个链接，则会使用该链接作为 iframe 的 src 属性，这允许你设置任意网页作为关于页面。"
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <Button variant="contained" onClick={submitAbout}>
                保存关于
              </Button>
            </Grid>
            <Grid xs={12}>
              <Alert severity="warning">
                移除 One API 的版权标识必须首先获得授权，项目维护需要花费大量精力，如果本项目对你有意义，请主动支持本项目。
              </Alert>
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth>
                <TextField
                  multiline
                  maxRows={15}
                  id="Footer"
                  label="页脚"
                  value={inputs.Footer}
                  name="Footer"
                  onChange={handleInputChange}
                  minRows={10}
                  placeholder="在此输入新的页脚，留空则使用默认页脚，支持 HTML 代码"
                />
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <Button variant="contained" onClick={submitFooter}>
                设置页脚
              </Button>
            </Grid>
          </Grid>
        </SubCard>
      </Stack>
      <Dialog open={showUpdateModal} onClose={() => setShowUpdateModal(false)} fullWidth maxWidth={'md'}>
        <DialogTitle sx={{ margin: '0px', fontWeight: 700, lineHeight: '1.55556', padding: '24px', fontSize: '1.125rem' }}>
          新版本：{updateData.tag_name}
        </DialogTitle>
        <Divider />
        <DialogContent>
          {' '}
          <div dangerouslySetInnerHTML={{ __html: updateData.content }}></div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUpdateModal(false)}>关闭</Button>
          <Button
            onClick={async () => {
              setShowUpdateModal(false);
              openGitHubRelease();
            }}
          >
            去GitHub查看
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OtherSetting;
