import { useEffect, useState, useRef, useCallback } from "react";
import { analyzeDiseasePhoto } from "../services/analysisService";
import {
  analyzePreviewPlaceholder,
  pageHeroImages
} from "../data/images";

/* ── severity config ───────────────────────────────────── */
const SEVERITY_CONFIG = {
  none:           { label: "None",     color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  low:            { label: "Low",      color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  low_to_moderate:{ label: "Moderate", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  moderate:       { label: "Moderate", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  high:           { label: "High",     color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  unknown:        { label: "Unknown",  color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

/* ── scanning status labels ────────────────────────────── */
const SCAN_STEPS = [
  "Uploading image…",
  "Scanning plant tissue…",
  "Detecting color anomalies…",
  "Matching disease patterns…",
  "Generating diagnosis…",
];

/* ── Confidence Ring (SVG) ─────────────────────────────── */
function ConfidenceRing({ value }) {
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (value / 100) * circumference;

  let ringColor = "#22c55e";
  if (value < 85) ringColor = "#f59e0b";
  if (value < 70) ringColor = "#ef4444";

  return (
    <div className="confidence-ring-wrap">
      <svg className="confidence-ring" viewBox="0 0 128 128">
        <circle
          cx="64" cy="64" r={radius}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke}
        />
        <circle
          className="confidence-ring-progress"
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          style={{ "--ring-offset": progress }}
        />
      </svg>
      <span className="confidence-ring-label">
        <strong>{value}%</strong>
        <small>confidence</small>
      </span>
    </div>
  );
}

/* ── Alert Modal ───────────────────────────────────────── */
function AlertModal({ message, onClose }) {
  return (
    <div className="alert-modal-overlay" onClick={onClose}>
      <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="alert-modal-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>Unable to Identify Disease</h3>
        <p className="alert-modal-message">{message}</p>
        <div className="alert-modal-tips">
          <p className="alert-modal-tips-title">Tips for better results:</p>
          <ul>
            <li>Use a well-lit, clear photo</li>
            <li>Focus directly on the affected area</li>
            <li>Avoid blurry or distant shots</li>
            <li>Make sure the plant fills most of the frame</li>
          </ul>
        </div>
        <button className="btn btn-primary alert-modal-btn" onClick={onClose}>
          Try Again
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────── */
function AnalyzePage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const fileInputRef = useRef(null);
  const scanIntervalRef = useRef(null);

  /* preview URL management */
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  /* scanning step ticker */
  useEffect(() => {
    if (isLoading) {
      setScanStep(0);
      scanIntervalRef.current = setInterval(() => {
        setScanStep((prev) => (prev + 1) % SCAN_STEPS.length);
      }, 1400);
    } else {
      clearInterval(scanIntervalRef.current);
    }
    return () => clearInterval(scanIntervalRef.current);
  }, [isLoading]);

  /* drag & drop handlers */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      setResult(null);
      setShowResult(false);
      setError("");
    } else {
      setError("Please drop a valid image file (JPEG, PNG, or WebP).");
    }
  }, []);

  function handleFileSelect(event) {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setResult(null);
    setShowResult(false);
    setError("");
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setShowResult(false);
    setError("");
    setShowAlert(false);
    setAlertMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAnalyze(event) {
    event.preventDefault();
    if (!file) {
      setError("Please upload a crop image first.");
      return;
    }

    setError("");
    setResult(null);
    setShowResult(false);
    setIsLoading(true);

    const analysis = await analyzeDiseasePhoto(file);

    setIsLoading(false);

    if (!analysis.accepted) {
      // Low confidence → show modal alert
      if (analysis.lowConfidence) {
        setAlertMessage(analysis.notes);
        setShowAlert(true);
      } else {
        // Bad image or server error → show inline error
        setError(analysis.notes);
      }
      setResult(null);
      return;
    }

    setResult(analysis);
    // Trigger staggered reveal animation
    requestAnimationFrame(() => setShowResult(true));
  }

  const previewSrc = previewUrl || analyzePreviewPlaceholder.src;
  const previewAlt = previewUrl ? "Uploaded crop preview" : analyzePreviewPlaceholder.alt;
  const sev = result ? (SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.unknown) : null;

  return (
    <>
      {/* Hero */}
      <section className="page-hero">
        <div className="container page-hero-split">
          <div>
            <p className="eyebrow">AI Plant Diagnostics</p>
            <h1 className="headline-animate">
              Upload a crop photo and get instant disease analysis
            </h1>
          </div>
          <div className="page-hero-visual media-frame">
            <img
              src={pageHeroImages.analyze.src}
              alt={pageHeroImages.analyze.alt}
              loading="lazy"
              width={1000}
              height={750}
            />
          </div>
        </div>
      </section>

      {/* Main analyze section */}
      <section className="analyze-section">
        <div className="container analyze-layout-v2">
          {/* LEFT: Upload Panel */}
          <div className="analyze-upload-panel table-card">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8, verticalAlign: "text-bottom" }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Upload Image
            </h3>

            <form onSubmit={handleAnalyze}>
              {/* Drag & drop zone */}
              <div
                className={`drop-zone ${isDragging ? "drop-zone--active" : ""} ${file ? "drop-zone--has-file" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  id="crop-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="drop-zone-input"
                />

                {file ? (
                  <div className="drop-zone-preview">
                    <img src={previewUrl} alt="Preview thumbnail" className="drop-zone-thumb" />
                    <div className="drop-zone-file-info">
                      <span className="drop-zone-filename">{file.name}</span>
                      <span className="drop-zone-filesize">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                ) : (
                  <div className="drop-zone-prompt">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="drop-zone-icon">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="drop-zone-title">Drag & drop your image here</p>
                    <p className="drop-zone-subtitle">or click to browse • JPEG, PNG, WebP</p>
                  </div>
                )}
              </div>

              {error && <p className="form-error analyze-error">{error}</p>}

              <div className="analyze-actions">
                <button
                  className="btn btn-primary analyze-btn"
                  disabled={isLoading || !file}
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <span className="btn-spinner" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Analyze Photo
                    </>
                  )}
                </button>
                {file && (
                  <button type="button" className="btn btn-ghost analyze-reset-btn" onClick={handleReset}>
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT: Preview + Results */}
          <div className="analyze-results-panel">
            {/* Image preview */}
            <div className="analyze-preview-card table-card">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8, verticalAlign: "text-bottom" }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                  <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Image Preview
              </h3>
              <div className={`analyze-preview-frame ${isLoading ? "analyze-preview-frame--scanning" : ""}`}>
                <img
                  src={previewSrc}
                  alt={previewAlt}
                  className={`analyze-preview-img ${!previewUrl ? "analyze-preview-img--placeholder" : ""}`}
                />
                {isLoading && (
                  <div className="scanner-overlay">
                    <div className="scanner-line" />
                    <div className="scanner-status">
                      <span className="scanner-dot" />
                      {SCAN_STEPS[scanStep]}
                    </div>
                  </div>
                )}
              </div>
              {!previewUrl && !isLoading && (
                <p className="hint" style={{ marginTop: 8 }}>
                  Upload a plant image to begin analysis.
                </p>
              )}
            </div>

            {/* Diagnosis Results */}
            {result && (
              <div className={`diagnosis-card table-card ${showResult ? "diagnosis-card--visible" : ""}`}>
                <div className="diagnosis-header">
                  <div>
                    <p className="diagnosis-label">Diagnosis Report</p>
                    <h2 className="diagnosis-disease">{result.disease}</h2>
                    {result.scientificName && result.scientificName !== "N/A" && (
                      <p className="diagnosis-sciname"><em>{result.scientificName}</em></p>
                    )}
                  </div>
                  <ConfidenceRing value={result.confidence} />
                </div>

                <div className="diagnosis-grid">
                  {/* Severity */}
                  <div className="diagnosis-field diagnosis-field--delay-1">
                    <span className="diagnosis-field-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Severity Level
                    </span>
                    {sev && (
                      <span className="severity-badge" style={{ color: sev.color, background: sev.bg }}>
                        {sev.label}
                      </span>
                    )}
                  </div>

                  {/* Affected Crops */}
                  {result.affectedCrops && result.affectedCrops.length > 0 && (
                    <div className="diagnosis-field diagnosis-field--delay-2">
                      <span className="diagnosis-field-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Typically Affects
                      </span>
                      <span className="diagnosis-field-value">{result.affectedCrops.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Symptoms */}
                {result.symptoms && (
                  <div className="diagnosis-section diagnosis-field--delay-3">
                    <h4 className="diagnosis-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Symptoms
                    </h4>
                    <p className="diagnosis-section-text">{result.symptoms}</p>
                  </div>
                )}

                {/* Management */}
                {result.management && result.management.length > 0 && (
                  <div className="diagnosis-section diagnosis-field--delay-4">
                    <h4 className="diagnosis-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Management Recommendations
                    </h4>
                    <ol className="diagnosis-mgmt-list">
                      {result.management.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Alert Modal */}
      {showAlert && (
        <AlertModal
          message={alertMessage}
          onClose={() => {
            setShowAlert(false);
            handleReset();
          }}
        />
      )}
    </>
  );
}

export default AnalyzePage;
