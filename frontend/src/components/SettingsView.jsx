import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('datasets'); // datasets, preprocessing, ml, performance, sources, system
  
  // Tab 1: Dataset Management State
  const [summary, setSummary] = useState({
    total_datasets: 42,
    processed: 36,
    processing: 3,
    failed: 2,
    last_upload: '27 Sep 2026 14:10'
  });
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [formatFilter, setFormatFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(7);
  const [totalCount, setTotalCount] = useState(42);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  
  // Accordions in Details Drawer
  const [openSections, setOpenSections] = useState({
    summary: true,
    preview: true,
    columns: false,
    logs: false,
    models: false
  });

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  
  // View Data Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Tab 2: Preprocessing State
  const [reprocessingLoading, setReprocessingLoading] = useState(false);

  // Tab 3: Machine Learning State
  const [mlDatasetId, setMlDatasetId] = useState('ds-001');
  const [mlTargetColumn, setMlTargetColumn] = useState('incident_flag');
  const [mlTargetType, setMlTargetType] = useState('classification');
  const [mlFeatureColumns, setMlFeatureColumns] = useState(['traffic_volume', 'avg_speed_kmh', 'congestion_index', 'signal_delay_sec', 'precipitation_mm']);
  const [mlTrees, setMlTrees] = useState(100);
  const [mlMaxDepth, setMlMaxDepth] = useState(15);
  const [mlTestSize, setMlTestSize] = useState(0.2);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState('');
  const [trainError, setTrainError] = useState('');
  const [trainingResult, setTrainingResult] = useState(null);

  // Tab 4: Model Performance State
  const [modelsList, setModelsList] = useState([]);
  const [activeModel, setActiveModel] = useState(null);

  // Tab 5: Data Sources State
  const [dataSources, setDataSources] = useState([]);
  const [testingSourceId, setTestingSourceId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [configureModalSource, setConfigureModalSource] = useState(null);

  // Tab 6: System Configuration & Health State
  const [systemConfig, setSystemConfig] = useState({
    default_city: 'Bengaluru',
    telemetry_refresh_sec: 2,
    prediction_horizon_hours: 6,
    prediction_confidence_min: 75.0,
    alert_threshold_critical: 85.0,
    alert_threshold_high: 70.0,
    alert_threshold_moderate: 50.0,
    dataset_retention_days: 90
  });
  const [systemHealth, setSystemHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // 1. Initial Load: Fetch Summary, Datasets, Models, Sources, System
  useEffect(() => {
    fetchSummary();
    fetchDatasets(1);
    fetchModels();
    fetchDataSources();
    fetchSystemInfo();
  }, []);

  // Fetch Datasets when filters or page change
  useEffect(() => {
    fetchDatasets(currentPage);
  }, [currentPage, statusFilter, formatFilter, sourceFilter]);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/datasets/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  const fetchDatasets = async (page = 1) => {
    setLoadingDatasets(true);
    try {
      let url = `${API_BASE}/settings/datasets?page=${page}&limit=6`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (statusFilter !== 'All') url += `&status=${encodeURIComponent(statusFilter)}`;
      if (formatFilter !== 'All') url += `&format=${encodeURIComponent(formatFilter)}`;
      if (sourceFilter !== 'All') url += `&source=${encodeURIComponent(sourceFilter)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.datasets || []);
        setTotalPages(data.total_pages || 1);
        setTotalCount(data.total || 0);
        if (!selectedDataset && data.datasets && data.datasets.length > 0) {
          setSelectedDataset(data.datasets[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load datasets:", err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/models`);
      if (res.ok) {
        const data = await res.json();
        setModelsList(data.models || []);
        setActiveModel(data.active_model || (data.models && data.models[0]));
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  };

  const fetchDataSources = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/data-sources`);
      if (res.ok) {
        const data = await res.json();
        setDataSources(data || []);
      }
    } catch (err) {
      console.error("Failed to load data sources:", err);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const [confRes, healthRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/settings/system`),
        fetch(`${API_BASE}/settings/health`),
        fetch(`${API_BASE}/settings/audit-logs`)
      ]);
      if (confRes.ok) setSystemConfig(await confRes.json());
      if (healthRes.ok) setSystemHealth(await healthRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
    } catch (err) {
      console.error("Failed to load system info:", err);
    }
  };

  // Toggle Accordion Section
  const toggleSection = (sec) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // File Upload Handlers
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      setUploadError("Maximum 10 datasets can be uploaded at one time.");
      return;
    }
    setUploadError('');
    setUploadFiles(files);
  };

  const handleDropFiles = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 10) {
      setUploadError("Maximum 10 datasets can be uploaded at one time.");
      return;
    }
    setUploadError('');
    setUploadFiles(files);
  };

  const submitUpload = async () => {
    if (uploadFiles.length === 0) return;
    if (uploadFiles.length > 10) {
      setUploadError("Maximum 10 datasets can be uploaded at one time.");
      return;
    }

    setUploadProgress("Validating and uploading files...");
    const formData = new FormData();
    uploadFiles.forEach(f => formData.append("files", f));
    formData.append("source", "Admin Upload");
    formData.append("uploaded_by", "Admin");

    try {
      const res = await fetch(`${API_BASE}/settings/datasets/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Upload failed");
      }
      setUploadProgress(null);
      setIsUploadModalOpen(false);
      setUploadFiles([]);
      fetchSummary();
      fetchDatasets(1);
    } catch (err) {
      setUploadError(err.message);
      setUploadProgress(null);
    }
  };

  // Dataset Actions
  const handleReprocess = async (dsId) => {
    setReprocessingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/datasets/${dsId}/reprocess`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDataset(data.dataset);
        fetchDatasets(currentPage);
        fetchSummary();
      }
    } catch (err) {
      console.error("Reprocess error:", err);
    } finally {
      setReprocessingLoading(false);
    }
  };

  const handleDeleteDataset = async (dsId) => {
    if (!window.confirm("Are you sure you want to delete this dataset?")) return;
    try {
      const res = await fetch(`${API_BASE}/settings/datasets/${dsId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDatasets(1);
        fetchSummary();
        setSelectedDataset(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleDownloadDataset = (dsId, filename) => {
    window.open(`${API_BASE}/settings/datasets/${dsId}/download`, '_blank');
  };

  // Machine Learning: Train Random Forest
  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainingStatus("Preparing data and initializing Random Forest...");
    setTrainError('');
    setTrainingResult(null);

    try {
      const payload = {
        dataset_id: mlDatasetId,
        target_column: mlTargetColumn,
        target_type: mlTargetType,
        feature_columns: mlFeatureColumns,
        n_estimators: parseInt(mlTrees) || 100,
        max_depth: parseInt(mlMaxDepth) || 15,
        test_size: parseFloat(mlTestSize) || 0.2,
        min_samples_split: 2,
        min_samples_leaf: 1,
        random_state: 42
      };

      setTrainingStatus("Training Random Forest trees across partitions...");
      const res = await fetch(`${API_BASE}/settings/models/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Model training failed.");

      setTrainingResult(data.model);
      setActiveModel(data.model);
      fetchModels();
      setTrainingStatus("Completed Successfully!");
    } catch (err) {
      setTrainError(err.message);
    } finally {
      setIsTraining(false);
    }
  };

  const handleActivateModel = async (modelId) => {
    try {
      const res = await fetch(`${API_BASE}/settings/models/${modelId}/activate`, {
        method: "POST"
      });
      if (res.ok) {
        fetchModels();
      }
    } catch (err) {
      console.error("Activate model error:", err);
    }
  };

  // Data Sources: Test Connection
  const handleTestConnection = async (sourceId) => {
    setTestingSourceId(sourceId);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/settings/data-sources/${sourceId}/test`, {
        method: "POST"
      });
      const data = await res.json();
      setTestResult({ sourceId, ...data });
      fetchDataSources();
    } catch (err) {
      setTestResult({ sourceId, status: "Failed", message: "Network connection refused." });
    } finally {
      setTestingSourceId(null);
    }
  };

  // System Settings: Save
  const handleSaveSystemConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/system`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemConfig)
      });
      if (res.ok) {
        setSaveSettingsSuccess(true);
        setTimeout(() => setSaveSettingsSuccess(false), 3000);
        fetchSystemInfo();
      }
    } catch (err) {
      console.error("Save system error:", err);
    }
  };

  // Helper: File Format Icon
  const getFormatBadge = (fmt) => {
    const f = (fmt || '').toUpperCase();
    if (f === 'XLSX' || f === 'XLS') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', fontWeight: 800, fontSize: '0.65rem' }}>
          XE
        </div>
      );
    }
    if (f === 'CSV') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#CCFBF1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D9488', fontWeight: 800, fontSize: '0.65rem' }}>
          CSV
        </div>
      );
    }
    if (f === 'PDF') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', fontWeight: 800, fontSize: '0.65rem' }}>
          PDF
        </div>
      );
    }
    if (f === 'JSON' || f === 'JSONL') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA', fontWeight: 800, fontSize: '0.65rem' }}>
          JS
        </div>
      );
    }
    if (f === 'ZIP') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C', fontWeight: 800, fontSize: '0.65rem' }}>
          ZIP
        </div>
      );
    }
    return (
      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 800, fontSize: '0.65rem' }}>
        PQ
      </div>
    );
  };

  // Helper: Status Pill
  const getStatusPill = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'processed') {
      return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#DCFCE7', color: '#16A34A' }}>Processed</span>;
    }
    if (s === 'processing') {
      return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#DBEAFE', color: '#2563EB' }}>Processing</span>;
    }
    if (s === 'warning') {
      return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#FEF3C7', color: '#D97706' }}>Warning</span>;
    }
    if (s === 'failed') {
      return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#FEE2E2', color: '#DC2626' }}>Failed</span>;
    }
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#F1F5F9', color: '#64748B' }}>{status}</span>;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', minHeight: '100vh', overflowY: 'auto' }}>
      
      {/* Top Header Bar Matching UrbanPulse System Exactly */}
      <header style={{
        height: '64px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}>
        {/* Search input pill */}
        <div style={{ display: 'flex', alignItems: 'center', width: '380px', position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: '#94A3B8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search location, report, type, or feature..."
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '38px',
              paddingRight: '14px',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              fontSize: '0.82rem',
              color: '#334155',
              outline: 'none'
            }}
          />
        </div>

        {/* Right Header Status Pill & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', fontWeight: 500, background: '#F1F5F9', padding: '6px 14px', borderRadius: '20px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span>Live Data</span>
            <span style={{ color: '#CBD5E1' }}>|</span>
            <span style={{ color: '#64748B' }}>27 Sep 2026 14:32:18</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', background: '#FFFFFF' }}>
            <span style={{ color: '#059669' }}>📍</span>
            <span>Bengaluru</span>
            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>▼</span>
          </div>

          {/* Quick action icons */}
          <button onClick={() => { fetchSummary(); fetchDatasets(currentPage); }} title="Refresh" style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
          <button title="Export" style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>
          <button title="Fullscreen" style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </div>
      </header>

      {/* Main Settings Page Container */}
      <div style={{ padding: '24px 28px', maxWidth: '1600px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Title Area */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
          <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Manage datasets, machine learning models, data sources and system configuration.
          </p>
        </div>

        {/* 6 Tabs Navigation Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '24px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'datasets', label: 'Dataset Management', icon: 'M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16M9 11h6M9 15h4' },
            { id: 'preprocessing', label: 'Preprocessing', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
            { id: 'ml', label: 'Machine Learning', icon: 'M12 3a9 9 0 0 0-9 9c0 3.6 2.1 6.7 5.2 8.1.3.1.6 0 .7-.3.1-.2.1-.5 0-.7-2.7-1.3-4.5-4-4.5-7.1 0-4.4 3.6-8 8-8s8 3.6 8 8c0 3.1-1.8 5.8-4.5 7.1-.2.2-.2.5 0 .7.1.3.4.4.7.3 3.1-1.4 5.2-4.5 5.2-8.1a9 9 0 0 0-9-9z' },
            { id: 'performance', label: 'Model Performance', icon: 'M18 20V10M12 20V4M6 20v-6' },
            { id: 'sources', label: 'Data Sources', icon: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
            { id: 'system', label: 'System', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 4px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #059669' : '2px solid transparent',
                color: activeTab === tab.id ? '#059669' : '#64748B',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={tab.icon}/>
              </svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: DATASET MANAGEMENT (STRICT IMAGE REFERENCE REPRODUCTION) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'datasets' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Main Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 5 Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                {/* Total Datasets */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Total Datasets</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{summary.total_datasets}</div>
                  </div>
                </div>

                {/* Processed */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Processed</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{summary.processed}</div>
                  </div>
                </div>

                {/* Processing */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Processing</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{summary.processing}</div>
                  </div>
                </div>

                {/* Failed */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C' }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Failed</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{summary.failed}</div>
                  </div>
                </div>

                {/* Last Upload */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA' }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Last Upload</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>27 Sep 2026</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>14:10</div>
                  </div>
                </div>
              </div>

              {/* Upload Datasets Dropzone Card */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropFiles}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center'
                }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', marginBottom: '12px' }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                </div>
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  Drag and drop datasets here or click to upload
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '16px' }}>
                  You can upload up to 10 datasets at a time (Excel, CSV, JSON, PDF, Parquet, ZIP)
                </div>

                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#059669',
                  color: '#FFFFFF',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  <span>Choose Files</span>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.json,.jsonl,.parquet,.pdf,.zip"
                    onChange={handleFileSelection}
                    style={{ display: 'none' }}
                  />
                </label>

                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '12px' }}>
                  Maximum 10 files per upload | Supported formats: .xlsx, .xls, .csv, .json, .parquet, .pdf, .zip
                </div>

                {/* Show Selected Files Pending Upload */}
                {uploadFiles.length > 0 && (
                  <div style={{ marginTop: '16px', width: '100%', maxWidth: '520px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Selected Files ({uploadFiles.length}/10):</span>
                      <button onClick={() => setUploadFiles([])} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.75rem', cursor: 'pointer' }}>Clear</button>
                    </div>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', textAlign: 'left', fontSize: '0.75rem', color: '#475569' }}>
                      {uploadFiles.map((f, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                          <span>{f.name}</span>
                          <span>{roundSize(f.size)}</span>
                        </div>
                      ))}
                    </div>
                    {uploadError && <div style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '6px' }}>{uploadError}</div>}
                    <button
                      onClick={submitUpload}
                      disabled={!!uploadProgress}
                      style={{
                        marginTop: '10px',
                        width: '100%',
                        background: '#059669',
                        color: '#FFF',
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      {uploadProgress || `Upload & Preprocess ${uploadFiles.length} File(s)`}
                    </button>
                  </div>
                )}
              </div>

              {/* Uploaded Datasets Table Container */}
              <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
                  Uploaded Datasets
                </div>

                {/* Filter Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {/* Search input */}
                  <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: '10px', top: '10px', width: '15px', height: '15px', color: '#94A3B8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input
                      type="text"
                      placeholder="Search datasets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') fetchDatasets(1); }}
                      style={{
                        width: '100%',
                        height: '36px',
                        paddingLeft: '32px',
                        paddingRight: '12px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.8rem',
                        color: '#334155',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Dropdowns */}
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    style={{ height: '36px', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0 10px', fontSize: '0.8rem', color: '#475569', background: '#FFF' }}
                  >
                    <option value="All">All Status</option>
                    <option value="Processed">Processed</option>
                    <option value="Processing">Processing</option>
                    <option value="Warning">Warning</option>
                    <option value="Failed">Failed</option>
                  </select>

                  <select
                    value={formatFilter}
                    onChange={(e) => { setFormatFilter(e.target.value); setCurrentPage(1); }}
                    style={{ height: '36px', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0 10px', fontSize: '0.8rem', color: '#475569', background: '#FFF' }}
                  >
                    <option value="All">All Formats</option>
                    <option value="XLSX">XLSX</option>
                    <option value="CSV">CSV</option>
                    <option value="PDF">PDF</option>
                    <option value="JSON">JSON</option>
                    <option value="ZIP">ZIP</option>
                    <option value="PARQUET">Parquet</option>
                  </select>

                  <select
                    value={sourceFilter}
                    onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                    style={{ height: '36px', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0 10px', fontSize: '0.8rem', color: '#475569', background: '#FFF' }}
                  >
                    <option value="All">All Sources</option>
                    <option value="Traffic Department">Traffic Department</option>
                    <option value="IMD">IMD</option>
                    <option value="BMTC">BMTC</option>
                    <option value="City Sensors">City Sensors</option>
                    <option value="Police Department">Police Department</option>
                    <option value="Environment Dept">Environment Dept</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0 12px', fontSize: '0.8rem', color: '#475569', background: '#FFF' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>Last 30 Days</span>
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>▼</span>
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontWeight: 600 }}>
                        <th style={{ padding: '10px 8px', width: '32px' }}>
                          <input type="checkbox" style={{ borderRadius: '4px' }}/>
                        </th>
                        <th style={{ padding: '10px 12px' }}>Dataset Name</th>
                        <th style={{ padding: '10px 12px' }}>Format</th>
                        <th style={{ padding: '10px 12px' }}>Size</th>
                        <th style={{ padding: '10px 12px' }}>Source</th>
                        <th style={{ padding: '10px 12px' }}>Upload Date</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasets.map((d) => (
                        <tr
                          key={d.id}
                          onClick={() => setSelectedDataset(d)}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            cursor: 'pointer',
                            background: selectedDataset?.id === d.id ? '#F0FDF4' : 'transparent',
                            transition: 'background 0.1s'
                          }}
                        >
                          <td style={{ padding: '12px 8px' }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" style={{ borderRadius: '4px' }}/>
                          </td>
                          <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {getFormatBadge(d.format)}
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{d.name}</span>
                          </td>
                          <td style={{ padding: '12px', color: '#475569', fontWeight: 500 }}>{d.format}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{d.size_display}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{d.source}</td>
                          <td style={{ padding: '12px', color: '#64748B' }}>
                            <div>{d.upload_date.split(' ').slice(0, 3).join(' ')}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{d.upload_date.split(' ')[3] || ''}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {getStatusPill(d.status)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => { setSelectedDataset(d); setIsPreviewModalOpen(true); }}
                                title="View Data"
                                style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              </button>
                              <button
                                onClick={() => handleDownloadDataset(d.id, d.name)}
                                title="Download"
                                style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                              </button>
                              <button
                                onClick={() => handleReprocess(d.id)}
                                title="Reprocess"
                                style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination matching reference screenshot */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', fontSize: '0.8rem', color: '#64748B' }}>
                  <div>
                    Showing 1 – {datasets.length} of {totalCount} datasets
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      &lt;
                    </button>
                    {[1, 2, 3, 4, 5].map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: currentPage === p ? 'none' : '1px solid #E2E8F0',
                          background: currentPage === p ? '#059669' : '#FFF',
                          color: currentPage === p ? '#FFF' : '#475569',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {p}
                      </button>
                    ))}
                    <span style={{ padding: '0 4px', color: '#94A3B8' }}>...</span>
                    <button
                      onClick={() => setCurrentPage(7)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: currentPage === 7 ? 'none' : '1px solid #E2E8F0',
                        background: currentPage === 7 ? '#059669' : '#FFF',
                        color: currentPage === 7 ? '#FFF' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      7
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Dataset Details Panel */}
            <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                Dataset Details
              </div>

              {selectedDataset ? (
                <>
                  {/* Selected Item Header Card */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {getFormatBadge(selectedDataset.format)}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', wordBreak: 'break-all' }}>{selectedDataset.name}</span>
                        {getStatusPill(selectedDataset.status)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px', lineHeight: 1.35 }}>
                        {selectedDataset.description}
                      </div>
                    </div>
                  </div>

                  {/* Key Metadata List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '12px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>📄 Format</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedDataset.format}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>💾 Size</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedDataset.size_display}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>🏢 Source</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedDataset.source}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>👤 Uploaded By</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedDataset.uploaded_by}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>📅 Upload Date</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedDataset.upload_date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>🔢 Rows (Original)</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedDataset.original_rows?.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>✨ Rows (Processed)</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedDataset.processed_rows?.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>📊 Columns</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedDataset.total_columns}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>● Status</span>
                      <span style={{ fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }}></span>
                        {selectedDataset.status}
                      </span>
                    </div>
                  </div>

                  {/* 3 Main Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setIsPreviewModalOpen(true)}
                      style={{
                        flex: 1.4,
                        background: '#059669',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>View Data</span>
                    </button>
                    <button
                      onClick={() => handleDownloadDataset(selectedDataset.id, selectedDataset.name)}
                      style={{
                        flex: 1.1,
                        background: '#FFF',
                        color: '#334155',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '9px 10px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDataset(selectedDataset.id)}
                      style={{
                        flex: 0.9,
                        background: '#FFF',
                        color: '#DC2626',
                        border: '1px solid #FCA5A5',
                        borderRadius: '8px',
                        padding: '9px 8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Collapsible Accordion Sections */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    
                    {/* 1. Preprocessing Summary */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div
                        onClick={() => toggleSection('summary')}
                        style={{ padding: '10px 12px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📄 Preprocessing Summary</span>
                        <span>{openSections.summary ? '▲' : '▼'}</span>
                      </div>
                      {openSections.summary && (
                        <div style={{ padding: '10px 12px', fontSize: '0.74rem', color: '#475569', background: '#FFF' }}>
                          <div>Missing Handled: <b>{selectedDataset.preprocessing_summary?.missing_values_handled || 0}</b></div>
                          <div>Duplicates Removed: <b>{selectedDataset.preprocessing_summary?.duplicates_removed || 0}</b></div>
                          <div>Outliers Flagged: <b>{selectedDataset.preprocessing_summary?.outliers_flagged || 0}</b></div>
                          <div style={{ marginTop: '4px', color: '#059669', fontWeight: 600 }}>{selectedDataset.preprocessing_summary?.status || 'Valid'}</div>
                        </div>
                      )}
                    </div>

                    {/* 2. Data Preview */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div
                        onClick={() => toggleSection('preview')}
                        style={{ padding: '10px 12px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📑 Data Preview</span>
                        <span>{openSections.preview ? '▲' : '▼'}</span>
                      </div>
                      {openSections.preview && (
                        <div style={{ padding: '10px 12px', fontSize: '0.74rem', color: '#475569', background: '#FFF' }}>
                          <div style={{ marginBottom: '6px' }}>First 5 Records:</div>
                          <div style={{ maxHeight: '110px', overflowX: 'auto', background: '#F8FAFC', padding: '6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {selectedDataset.preview_rows && selectedDataset.preview_rows.length > 0 ? (
                              selectedDataset.preview_rows.map((r, i) => (
                                <div key={i} style={{ whiteSpace: 'nowrap', marginBottom: '2px' }}>
                                  #{i+1}: {JSON.stringify(r).slice(0, 70)}...
                                </div>
                              ))
                            ) : (
                              <div>No preview rows available.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Column Information */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div
                        onClick={() => toggleSection('columns')}
                        style={{ padding: '10px 12px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>☷ Column Information</span>
                        <span>{openSections.columns ? '▲' : '▼'}</span>
                      </div>
                      {openSections.columns && (
                        <div style={{ padding: '10px 12px', fontSize: '0.74rem', color: '#475569', background: '#FFF', maxHeight: '130px', overflowY: 'auto' }}>
                          {selectedDataset.columns_meta?.map((c, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #F1F5F9' }}>
                              <span style={{ fontWeight: 600 }}>{c.name}</span>
                              <span style={{ color: '#94A3B8' }}>{c.type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4. Processing Logs */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div
                        onClick={() => toggleSection('logs')}
                        style={{ padding: '10px 12px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📜 Processing Logs</span>
                        <span>{openSections.logs ? '▲' : '▼'}</span>
                      </div>
                      {openSections.logs && (
                        <div style={{ padding: '10px 12px', fontSize: '0.72rem', color: '#475569', background: '#FFF', maxHeight: '120px', overflowY: 'auto' }}>
                          {selectedDataset.processing_logs?.map((l, i) => (
                            <div key={i} style={{ marginBottom: '4px' }}>
                              <span style={{ color: '#94A3B8' }}>[{l.time}]</span> <b>{l.step}:</b> {l.detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 5. Related Models */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div
                        onClick={() => toggleSection('models')}
                        style={{ padding: '10px 12px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>⚛ Related Models</span>
                        <span>{openSections.models ? '▲' : '▼'}</span>
                      </div>
                      {openSections.models && (
                        <div style={{ padding: '10px 12px', fontSize: '0.74rem', color: '#475569', background: '#FFF' }}>
                          {selectedDataset.related_models && selectedDataset.related_models.length > 0 ? (
                            selectedDataset.related_models.map((m, i) => (
                              <div key={i} style={{ padding: '3px 6px', background: '#F1F5F9', borderRadius: '4px', marginBottom: '3px' }}>
                                {m}
                              </div>
                            ))
                          ) : (
                            <div>No linked models yet. Train a Random Forest model on this dataset in the Machine Learning tab.</div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.84rem' }}>
                  Select a dataset from the table to view its configuration and preprocessing details.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PREPROCESSING WORKSPACE                               */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'preprocessing' && (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Automated Preprocessing Pipeline</h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>14-Stage telemetry standardization, outlier detection, and geospatial normalization.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={selectedDataset?.id || 'ds-001'}
                  onChange={(e) => {
                    const found = datasets.find(d => d.id === e.target.value);
                    if (found) setSelectedDataset(found);
                  }}
                  style={{ height: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '0.82rem', color: '#334155' }}
                >
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                  ))}
                </select>
                <button
                  onClick={() => selectedDataset && handleReprocess(selectedDataset.id)}
                  disabled={reprocessingLoading}
                  style={{
                    background: '#059669',
                    color: '#FFF',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {reprocessingLoading ? "Running Pipeline..." : "Reprocess Dataset"}
                </button>
              </div>
            </div>

            {/* Pipeline Stage Indicators (14 Stages) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '24px' }}>
              {[
                { stage: 1, name: "File Validation" },
                { stage: 2, name: "Schema Detection" },
                { stage: 3, name: "Column Standardize" },
                { stage: 4, name: "Type Conversion" },
                { stage: 5, name: "Missing Handling" },
                { stage: 6, name: "Deduplication" },
                { stage: 7, name: "Invalid Value Check" },
                { stage: 8, name: "Date Normalization" },
                { stage: 9, name: "Unit Normalization" },
                { stage: 10, name: "Outlier Detection" },
                { stage: 11, name: "Categorical Encoding" },
                { stage: 12, name: "Numerical Prep" },
                { stage: 13, name: "Location Bounds" },
                { stage: 14, name: "Final Generation" }
              ].map(st => (
                <div key={st.stage} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', margin: '0 auto 6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                    ✓
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155' }}>Stage {st.stage}</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748B' }}>{st.name}</div>
                </div>
              ))}
            </div>

            {/* Summary Grid for Selected Dataset */}
            {selectedDataset && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', background: '#F1F5F9', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Original Rows</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{selectedDataset.original_rows?.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Processed Rows</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16A34A' }}>{selectedDataset.processed_rows?.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Missing Handled</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{selectedDataset.preprocessing_summary?.missing_values_handled || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Deduplicated Rows</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{selectedDataset.preprocessing_summary?.duplicates_removed || 0}</div>
                </div>
              </div>
            )}

            {/* Real Processing Execution Logs */}
            <div style={{ background: '#0F172A', color: '#E2E8F0', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '0.78rem', maxHeight: '220px', overflowY: 'auto' }}>
              <div style={{ color: '#10B981', fontWeight: 700, marginBottom: '6px' }}>UrbanPulse Preprocessing Pipeline Execution Log:</div>
              {selectedDataset?.processing_logs?.map((l, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>[{l.time}]</span> <span style={{ color: '#38BDF8' }}>[{l.step}]</span> <span style={{ color: l.status === 'SUCCESS' ? '#4ADE80' : '#F87171' }}>{l.status}:</span> {l.detail}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: MACHINE LEARNING & RANDOM FOREST TRAINING              */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ml' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '24px' }}>
            {/* Left: Configuration Form */}
            <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Random Forest Model Training</h2>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 20px 0' }}>Configure scikit-learn ensemble classifier or regressor with urban telemetry features.</p>

              {/* Dataset Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Processed Training Dataset</label>
                <select
                  value={mlDatasetId}
                  onChange={(e) => setMlDatasetId(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '0.82rem', color: '#334155' }}
                >
                  {datasets.filter(d => d.status === 'Processed').map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.processed_rows} rows, {d.total_columns} cols)</option>
                  ))}
                </select>
              </div>

              {/* Target Column & Problem Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Target Column (y)</label>
                  <select
                    value={mlTargetColumn}
                    onChange={(e) => {
                      setMlTargetColumn(e.target.value);
                      if (e.target.value.includes('flag') || e.target.value.includes('condition')) {
                        setMlTargetType('classification');
                      } else {
                        setMlTargetType('regression');
                      }
                    }}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '0.82rem', color: '#334155' }}
                  >
                    <option value="incident_flag">incident_flag (Binary Classification)</option>
                    <option value="avg_speed_kmh">avg_speed_kmh (Continuous Speed Regression)</option>
                    <option value="congestion_index">congestion_index (Congestion Regression)</option>
                    <option value="signal_delay_sec">signal_delay_sec (Delay Seconds Regression)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Model Algorithm</label>
                  <div style={{ display: 'flex', height: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setMlTargetType('classification')}
                      style={{
                        flex: 1,
                        background: mlTargetType === 'classification' ? '#059669' : '#FFF',
                        color: mlTargetType === 'classification' ? '#FFF' : '#64748B',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      RandomForestClassifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setMlTargetType('regression')}
                      style={{
                        flex: 1,
                        background: mlTargetType === 'regression' ? '#059669' : '#FFF',
                        color: mlTargetType === 'regression' ? '#FFF' : '#64748B',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      RandomForestRegressor
                    </button>
                  </div>
                </div>
              </div>

              {/* Feature Columns Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Candidate Feature Columns ({mlFeatureColumns.length} selected)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', maxHeight: '160px', overflowY: 'auto' }}>
                  {[
                    'traffic_volume',
                    'avg_speed_kmh',
                    'congestion_index',
                    'signal_delay_sec',
                    'precipitation_mm',
                    'pedestrian_density',
                    'air_quality_aqi',
                    'bus_headway_min'
                  ].map(feat => (
                    <label key={feat} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={mlFeatureColumns.includes(feat)}
                        onChange={(e) => {
                          if (e.target.checked) setMlFeatureColumns([...mlFeatureColumns, feat]);
                          else setMlFeatureColumns(mlFeatureColumns.filter(f => f !== feat));
                        }}
                      />
                      <span>{feat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hyperparameter Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>Number of Trees (n_estimators)</label>
                  <input
                    type="number"
                    value={mlTrees}
                    onChange={(e) => setMlTrees(e.target.value)}
                    style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 8px', fontSize: '0.8rem', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>Max Depth (max_depth)</label>
                  <input
                    type="number"
                    value={mlMaxDepth}
                    onChange={(e) => setMlMaxDepth(e.target.value)}
                    style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 8px', fontSize: '0.8rem', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>Test Split Ratio</label>
                  <input
                    type="number"
                    step="0.05"
                    value={mlTestSize}
                    onChange={(e) => setMlTestSize(e.target.value)}
                    style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 8px', fontSize: '0.8rem', marginTop: '4px' }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleTrainModel}
                disabled={isTraining || mlFeatureColumns.length === 0}
                style={{
                  width: '100%',
                  background: isTraining ? '#94A3B8' : '#059669',
                  color: '#FFFFFF',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isTraining ? 'not-allowed' : 'pointer'
                }}
              >
                {isTraining ? trainingStatus : "🚀 Train Random Forest Model"}
              </button>

              {trainError && (
                <div style={{ marginTop: '12px', color: '#DC2626', fontSize: '0.8rem', background: '#FEE2E2', padding: '8px', borderRadius: '6px' }}>
                  {trainError}
                </div>
              )}
            </div>

            {/* Right: Live Training Status / Result Box */}
            <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>Training Result</h3>
              
              {trainingResult ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.75rem' }}>Active Model</span>
                    <span style={{ fontWeight: 800, color: '#0F172A' }}>{trainingResult.name} ({trainingResult.version})</span>
                  </div>
                  
                  {/* Metrics Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    {trainingResult.target_type === 'classification' ? (
                      <>
                        <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Accuracy</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A' }}>{(trainingResult.metrics.accuracy * 100).toFixed(1)}%</div>
                        </div>
                        <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>F1-Score</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563EB' }}>{trainingResult.metrics.f1_score}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>R² Score</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A' }}>{trainingResult.metrics.r2_score}</div>
                        </div>
                        <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>RMSE</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EA580C' }}>{trainingResult.metrics.rmse}</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Feature Importance Preview */}
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Feature Importance:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {trainingResult.feature_importance?.slice(0, 5).map((f, i) => (
                      <div key={i} style={{ fontSize: '0.74rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>{f.feature}</span>
                          <b>{(f.importance * 100).toFixed(1)}%</b>
                        </div>
                        <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${f.importance * 100}%`, height: '100%', background: '#059669' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94A3B8', fontSize: '0.84rem' }}>
                  No training session running. Configure hyperparameters and click Train Model to start.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: MODEL PERFORMANCE & VERSION REGISTRY                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeModel ? (
              <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#DCFCE7', color: '#16A34A', fontWeight: 800, fontSize: '0.75rem' }}>Active Model</span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{activeModel.name} ({activeModel.version})</h2>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                      Algorithm: <b>{activeModel.algorithm}</b> | Trained on: <b>{activeModel.dataset_name}</b> ({activeModel.trained_at})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Training Duration</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>{activeModel.training_duration}</div>
                  </div>
                </div>

                {/* Real Evaluation Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  {activeModel.target_type === 'classification' ? (
                    <>
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Accuracy</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16A34A' }}>{(activeModel.metrics?.accuracy * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Precision</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB' }}>{(activeModel.metrics?.precision * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Recall</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7C3AED' }}>{(activeModel.metrics?.recall * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>F1 Score</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>{activeModel.metrics?.f1_score}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>R² Score</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16A34A' }}>{activeModel.metrics?.r2_score}</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>RMSE</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#EA580C' }}>{activeModel.metrics?.rmse}</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>MAE</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB' }}>{activeModel.metrics?.mae}</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Features Used</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>{activeModel.feature_count}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Feature Importance Bar Chart */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>Feature Importance Ranking (Gini / Variance Criterion)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeModel.feature_importance?.map((fi, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 60px', alignItems: 'center', gap: '14px', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{fi.feature}</span>
                        <div style={{ height: '14px', background: '#F1F5F9', borderRadius: '7px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, fi.importance * 100 * 2)}%`, height: '100%', background: '#059669', borderRadius: '7px' }}></div>
                        </div>
                        <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>{(fi.importance * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Version History Table */}
                <div>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>Trained Model Versions</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                        <th style={{ padding: '8px' }}>Version</th>
                        <th style={{ padding: '8px' }}>Model Name</th>
                        <th style={{ padding: '8px' }}>Algorithm</th>
                        <th style={{ padding: '8px' }}>Records</th>
                        <th style={{ padding: '8px' }}>Trained Date</th>
                        <th style={{ padding: '8px' }}>Status</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelsList.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 800 }}>{m.version}</td>
                          <td style={{ padding: '10px 8px', color: '#1E293B' }}>{m.name}</td>
                          <td style={{ padding: '10px 8px', color: '#64748B' }}>{m.algorithm}</td>
                          <td style={{ padding: '10px 8px' }}>{m.record_count?.toLocaleString()}</td>
                          <td style={{ padding: '10px 8px', color: '#64748B' }}>{m.trained_at}</td>
                          <td style={{ padding: '10px 8px' }}>
                            {m.status === 'Active' ? (
                              <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.72rem' }}>Active</span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#F1F5F9', color: '#64748B', fontWeight: 700, fontSize: '0.72rem' }}>Archived</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {m.status !== 'Active' ? (
                              <button
                                onClick={() => handleActivateModel(m.id)}
                                style={{ background: '#059669', color: '#FFF', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Activate
                              </button>
                            ) : (
                              <span style={{ color: '#16A34A', fontSize: '0.74rem', fontWeight: 700 }}>In Production</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              <div style={{ background: '#FFF', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                No trained model available. Switch to the Machine Learning tab to train a model.
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: DATA SOURCES                                           */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'sources' && (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Urban Telemetry Data Sources</h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>Manage live external API integrations, polling frequencies, and credentials.</p>
              </div>
              <button
                onClick={fetchDataSources}
                style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Refresh Status
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ padding: '10px 12px' }}>Source Name</th>
                  <th style={{ padding: '10px 12px' }}>Type</th>
                  <th style={{ padding: '10px 12px' }}>Endpoint URL</th>
                  <th style={{ padding: '10px 12px' }}>Refresh Interval</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Last Successful Sync</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: '#0F172A' }}>{s.name}</td>
                    <td style={{ padding: '14px 12px', color: '#475569' }}>{s.source_type}</td>
                    <td style={{ padding: '14px 12px', color: '#64748B', fontFamily: 'monospace', fontSize: '0.76rem' }}>{s.endpoint_url}</td>
                    <td style={{ padding: '14px 12px' }}>{s.refresh_interval_sec}s</td>
                    <td style={{ padding: '14px 12px' }}>
                      {s.status === 'Connected' ? (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.74rem' }}>● Connected</span>
                      ) : (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#FEF3C7', color: '#D97706', fontWeight: 700, fontSize: '0.74rem' }}>● Degraded</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 12px', color: '#64748B' }}>{s.last_sync}</td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleTestConnection(s.id)}
                        disabled={testingSourceId === s.id}
                        style={{
                          background: '#059669',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {testingSourceId === s.id ? "Pinging..." : "Test Connection"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {testResult && (
              <div style={{ marginTop: '16px', background: testResult.status === 'Connected' ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${testResult.status === 'Connected' ? '#A7F3D0' : '#FECACA'}`, borderRadius: '8px', padding: '12px', fontSize: '0.8rem', color: testResult.status === 'Connected' ? '#065F46' : '#991B1B' }}>
                <b>Connection Test:</b> {testResult.message}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: SYSTEM CONFIGURATION & REAL HEALTH CHECKS              */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'system' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 440px', gap: '24px' }}>
            
            {/* Left: Configuration Form */}
            <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Authority System Configuration</h2>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 20px 0' }}>Configure global telemetry intervals, alert thresholds, and dataset retention.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Default Operational City</label>
                  <input
                    type="text"
                    value={systemConfig.default_city || 'Bengaluru'}
                    onChange={(e) => setSystemConfig({ ...systemConfig, default_city: e.target.value })}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Telemetry Polling (seconds)</label>
                    <input
                      type="number"
                      value={systemConfig.telemetry_refresh_sec || 2}
                      onChange={(e) => setSystemConfig({ ...systemConfig, telemetry_refresh_sec: parseInt(e.target.value) })}
                      style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Prediction Horizon (hours)</label>
                    <input
                      type="number"
                      value={systemConfig.prediction_horizon_hours || 6}
                      onChange={(e) => setSystemConfig({ ...systemConfig, prediction_horizon_hours: parseInt(e.target.value) })}
                      style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#DC2626', marginBottom: '4px' }}>Critical Alert (%)</label>
                    <input
                      type="number"
                      value={systemConfig.alert_threshold_critical || 85}
                      onChange={(e) => setSystemConfig({ ...systemConfig, alert_threshold_critical: parseFloat(e.target.value) })}
                      style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#EA580C', marginBottom: '4px' }}>High Alert (%)</label>
                    <input
                      type="number"
                      value={systemConfig.alert_threshold_high || 70}
                      onChange={(e) => setSystemConfig({ ...systemConfig, alert_threshold_high: parseFloat(e.target.value) })}
                      style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#D97706', marginBottom: '4px' }}>Moderate Alert (%)</label>
                    <input
                      type="number"
                      value={systemConfig.alert_threshold_moderate || 50}
                      onChange={(e) => setSystemConfig({ ...systemConfig, alert_threshold_moderate: parseFloat(e.target.value) })}
                      style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Dataset Retention Window (Days)</label>
                  <input
                    type="number"
                    value={systemConfig.dataset_retention_days || 90}
                    onChange={(e) => setSystemConfig({ ...systemConfig, dataset_retention_days: parseInt(e.target.value) })}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px', fontSize: '0.82rem' }}
                  />
                </div>

                <button
                  onClick={handleSaveSystemConfig}
                  style={{
                    marginTop: '10px',
                    background: '#059669',
                    color: '#FFF',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer'
                  }}
                >
                  Save System Settings
                </button>

                {saveSettingsSuccess && (
                  <div style={{ color: '#16A34A', fontSize: '0.8rem', fontWeight: 600 }}>
                    ✓ Settings saved and persisted successfully!
                  </div>
                )}
              </div>
            </div>

            {/* Right: Real System Health Checks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 14px 0' }}>System Health Checks</h3>
                
                {systemHealth ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B' }}>{systemHealth.backend.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Port 8000 ({systemHealth.backend.latency_ms}ms)</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.72rem' }}>Healthy</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B' }}>{systemHealth.database.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Active Pool: {systemHealth.database.active_connections} conn ({systemHealth.database.latency_ms}ms)</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.72rem' }}>Healthy</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B' }}>{systemHealth.pipeline.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{systemHealth.pipeline.active_corridors} Corridors @ {systemHealth.pipeline.events_per_second} msg/sec</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.72rem' }}>Healthy</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B' }}>{systemHealth.ml_service.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{systemHealth.ml_service.framework} ({systemHealth.ml_service.loaded_models_count} loaded)</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.72rem' }}>Healthy</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B' }}>{systemHealth.external_apis.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{systemHealth.external_apis.connected_sources}/{systemHealth.external_apis.total_sources} Connected</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.72rem' }}>Operational</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Loading health statuses...</div>
                )}
              </div>

              {/* Administrative Audit Logs */}
              <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
                <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>Recent Administrative Audit Logs</h3>
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
                  {auditLogs.map((log, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                        <span><b>{log.action}</b> by {log.user}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div style={{ color: '#334155' }}>{log.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* View Data Fullscreen Modal */}
      {isPreviewModalOpen && selectedDataset && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Data Preview: {selectedDataset.name}</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Showing first rows and verified column mappings</span>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              {selectedDataset.preview_rows && selectedDataset.preview_rows.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                      {Object.keys(selectedDataset.preview_rows[0]).map(k => (
                        <th key={k} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDataset.preview_rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} style={{ padding: '8px 10px', color: '#475569' }}>{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>No preview data available.</div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', textAlign: 'right' }}>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                style={{ background: '#059669', color: '#FFF', padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function roundSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
