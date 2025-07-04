import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Space, Button, Modal, Form, Input,
  Select, DatePicker, Row, Col, message
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, MinusCircleOutlined,
  ExclamationCircleOutlined, SyncOutlined, EditOutlined,
  DeleteOutlined, LockOutlined, CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams, useNavigate } from 'react-router-dom';

const { Option } = Select;
const { confirm } = Modal;

const MAIN_BIN_ID = '682c44bf8960c979a59d8006';
const JSONBIN_API = 'https://api.jsonbin.io/v3/b';
const ACCESS_KEY = '$2a$10$E8n0tBaz.zWHVc4S9UDEkO3UTGM2Ir0XxuiLYYkJf1TZz8Z0QMvjC';

const axiosConfig = {
  headers: {
    'X-Access-Key': ACCESS_KEY,
    'Content-Type': 'application/json'
  }
};

const statusOptions = [
  { value: 'completed', label: 'Completed' },
  { value: 'in progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
  { value: 'not started', label: 'Not started' },
];

const projectOptions = ['MyGraPARI', 'OM', 'LRT_Sumsel'];
const deployOptions = ['Local', 'Dev', 'Production'];

const App = () => {
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [localToken, setLocalToken] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const getParam = (key, isArray = false) => {
    const val = searchParams.get(key);
    return isArray && val ? val.split(',') : val;
  };

  const [searchText, setSearchText] = useState(getParam('search') || '');
  const [filterStatus, setFilterStatus] = useState(getParam('status', true) || []);
  const [filterProject, setFilterProject] = useState(getParam('project') || null);
  const [filterDate, setFilterDate] = useState(getParam('date') ? dayjs(getParam('date')) : null);
  const [filterDeploy, setFilterDeploy] = useState(getParam('deploy') || null);

  useEffect(() => {
    const storedToken = localStorage.getItem('task-token');
    setLocalToken(storedToken);
    setIsReadOnly(storedToken !== '112233');
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${JSONBIN_API}/${MAIN_BIN_ID}`, axiosConfig);
      setData(res.data.record || []);
    } catch (err) {
      console.error(err);
      message.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const updateURLParams = (params) => {
    const newParams = new URLSearchParams();
    if (params.search) newParams.set('search', params.search);
    if (params.status?.length) newParams.set('status', params.status.join(','));
    if (params.project) newParams.set('project', params.project);
    if (params.deploy) newParams.set('deploy', params.deploy);
    if (params.date) newParams.set('date', params.date.format('YYYY-MM-DD'));
    setSearchParams(newParams);
  };

  useEffect(() => {
    updateURLParams({ search: searchText, status: filterStatus, project: filterProject, deploy: filterDeploy, date: filterDate });
  }, [searchText, filterStatus, filterProject, filterDeploy, filterDate]);

  const saveData = async (newData) => {
    try {
      await axios.put(`${JSONBIN_API}/${MAIN_BIN_ID}`, newData, axiosConfig);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error('Failed to save data');
    }
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      setSubmitLoading(true);
      const newTask = {
        ...values,
        deadline: values.deadline.format('YYYY-MM-DD'),
        key: editingTask ? editingTask.key : uuidv4()
      };
      const newData = editingTask ?
        data.map(item => item.key === editingTask.key ? newTask : item) :
        [...data, newTask];
      message.success(editingTask ? 'Task updated' : 'Task created');
      setModalOpen(false);
      setEditingTask(null);
      form.resetFields();
      await saveData(newData);
      setSubmitLoading(false);
    }).catch(() => setSubmitLoading(false));
  };

  const handleDelete = (record) => {
    confirm({
      title: `Delete task "${record.name}"?`,
      okType: 'danger',
      onOk: async () => {
        setDeletingKey(record.key);
        const newData = data.filter(item => item.key !== record.key);
        await saveData(newData);
        setDeletingKey(null);
        message.success('Deleted');
      },
      onCancel: () => setDeletingKey(null)
    });
  };

  const filteredData = data.filter(item => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch =
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.project?.toLowerCase().includes(searchLower) ||
      item.status?.toLowerCase().includes(searchLower) ||
      item.note?.toLowerCase().includes(searchLower) ||
      item.deploy?.toLowerCase().includes(searchLower);
    const matchesStatus = filterStatus.length === 0 || filterStatus.includes(item.status);
    const matchesProject = !filterProject || item.project === filterProject;
    const matchesDeploy = !filterDeploy || item.deploy === filterDeploy;
    const matchesDate = !filterDate || (item.deadline && dayjs(item.deadline).isSame(filterDate, 'day'));
    return matchesSearch && matchesStatus && matchesProject && matchesDeploy && matchesDate;
  });

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={3}><Input placeholder="Search..." value={searchText} onChange={e => setSearchText(e.target.value)} allowClear /></Col>
        <Col span={3}><Select mode="multiple" placeholder="Status" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: '100%' }}>{statusOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}</Select></Col>
        <Col span={3}><Select placeholder="Project" value={filterProject} onChange={setFilterProject} allowClear style={{ width: '100%' }}>{projectOptions.map(p => <Option key={p} value={p}>{p}</Option>)}</Select></Col>
        <Col span={3}><Select placeholder="Deploy" value={filterDeploy} onChange={setFilterDeploy} allowClear style={{ width: '100%' }}>{deployOptions.map(d => <Option key={d} value={d}>{d}</Option>)}</Select></Col>
        <Col span={3}><DatePicker placeholder="Date" value={filterDate} onChange={setFilterDate} allowClear style={{ width: '100%' }} /></Col>
        <Col span={3}><Select value={pageSize} onChange={setPageSize} style={{ width: '100%' }}>{[5, 10, 20, 50].map(size => <Option key={size} value={size}>Show {size}</Option>)}</Select></Col>
        <Col span={4}>{!localToken ? <Button icon={<LockOutlined />} onClick={() => setTokenModalOpen(true)} style={{ backgroundColor: '#000', borderColor: '#000', color: '#fff' }} /> : <Button type="primary" icon={<CloseOutlined />} danger onClick={() => { localStorage.removeItem('task-token'); setLocalToken(null); setIsReadOnly(true); message.info('Logged out'); }} />}</Col>
        <Col span={2} style={{ textAlign: 'right' }}><Button type="primary" disabled={isReadOnly} onClick={() => { setModalOpen(true); form.resetFields(); setEditingTask(null); }}>Create</Button></Col>
      </Row>

      <Table
        columns={[
          { title: 'No', render: (_, __, index) => (currentPage - 1) * pageSize + index + 1, width: 50 },
          { title: 'Name', dataIndex: 'name' },
          { title: 'Description', dataIndex: 'description' },
          { title: 'Project', dataIndex: 'project' },
          { title: 'Date', dataIndex: 'deadline', width: 110 },
          { title: 'Deploy', dataIndex: 'deploy', render: d => d ? <Tag color="geekblue">{d}</Tag> : '' },
          {
            title: 'Status', dataIndex: 'status', render: s => {
              let color = 'default';
              let icon = null;
              switch (s) {
                case 'completed': color = 'green'; icon = <CheckCircleOutlined />; break;
                case 'in progress': color = 'blue'; icon = <SyncOutlined spin />; break;
                case 'pending': color = 'orange'; icon = <ClockCircleOutlined />; break;
                case 'not started': color = 'cyan'; icon = <ExclamationCircleOutlined />; break;
                default: color = 'red'; icon = <MinusCircleOutlined />; break;
              }
              return <Tag icon={icon} color={color}>{s.toUpperCase()}</Tag>;
            }
          },
          { title: 'Note', dataIndex: 'note' },
          {
            title: 'Action', render: (_, record) => (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => { setEditingTask(record); form.setFieldsValue({ ...record, deadline: dayjs(record.deadline) }); setModalOpen(true); }} disabled={isReadOnly} />
                <Button icon={<DeleteOutlined />} danger loading={deletingKey === record.key} onClick={() => handleDelete(record)} disabled={isReadOnly} />
              </Space>
            )
          }
        ]}
        dataSource={filteredData}
        rowKey="key"
        pagination={{
          current: currentPage,
          pageSize,
          onChange: page => setCurrentPage(page),
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
        }}
        loading={loading}
        scroll={{ x: 1000 }}
      />

      <Modal open={modalOpen} title={editingTask ? 'Edit Task' : 'Create Task'} onCancel={() => setModalOpen(false)} onOk={handleOk} confirmLoading={submitLoading} okButtonProps={{ disabled: isReadOnly }}>
        <Form form={form} layout="vertical" initialValues={{ status: 'not started' }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input disabled={isReadOnly} /></Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={3} disabled={isReadOnly} /></Form.Item>
          <Form.Item name="project" label="Project" rules={[{ required: true }]}><Select disabled={isReadOnly}>{projectOptions.map(p => <Option key={p} value={p}>{p}</Option>)}</Select></Form.Item>
          <Form.Item name="deploy" label="Deploy" rules={[{ required: true }]}><Select disabled={isReadOnly}>{deployOptions.map(d => <Option key={d} value={d}>{d}</Option>)}</Select></Form.Item>
          <Form.Item name="deadline" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={isReadOnly} /></Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}><Select disabled={isReadOnly}>{statusOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}</Select></Form.Item>
          <Form.Item name="note" label="Note"><Input.TextArea rows={3} disabled={isReadOnly} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={tokenModalOpen} title="Enter Token" onCancel={() => { setTokenModalOpen(false); setTokenInput(''); }} onOk={() => {
        if (tokenInput === '112233') {
          localStorage.setItem('task-token', tokenInput);
          setLocalToken(tokenInput);
          setIsReadOnly(false);
          message.success('Token saved');
        } else {
          message.error('Invalid token');
        }
        setTokenModalOpen(false);
        setTokenInput('');
      }}>
        <Input placeholder="Token : 112233" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} />
      </Modal>
    </div>
  );
};

export default App;