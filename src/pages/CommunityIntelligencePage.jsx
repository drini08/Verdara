import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function CommunityIntelligencePage() {
  const { user, token, isAuthenticated } = useAuth();
  
  // Report Form State
  const [location, setLocation] = useState("");
  const [cropType, setCropType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ text: "", type: "" });

  // Safety: Reset submission state on mount
  useEffect(() => {
    setIsSubmitting(false);
  }, []);

  // Reports Dashboard State
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Editing State
  const [editingReportId, setEditingReportId] = useState(null);
  const [editLocation, setEditLocation] = useState("");
  const [editCropType, setEditCropType] = useState("");
  const [editIssueDescription, setEditIssueDescription] = useState("");

  const fetchReports = async (showLoading = true) => {
    if (showLoading) setIsLoadingReports(true);
    try {
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/intelligence/reports", { headers });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      if (showLoading) setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    // Initial fetch with loading state
    fetchReports(true);

    // Set up polling interval to fetch new reports from the community every 30 seconds
    // Increased interval to prevent potential focus-loss issues while typing
    const interval = setInterval(() => {
      fetchReports(false); // Silent update in the background
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage({ text: "", type: "" });

    // Prepare report object for optimistic update
    const newReport = {
      id: Date.now(), // Temporary ID
      location,
      cropType,
      issueDescription,
      userId: user?.id,
      createdAt: new Date().toISOString()
    };

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/intelligence/reports", {
        method: "POST",
        headers,
        body: JSON.stringify({ location, cropType, issueDescription }),
      });

      if (response.ok) {
        const responseData = await response.json();
        setSubmitMessage({ text: "Report submitted successfully! Thank you.", type: "success" });
        setLocation("");
        setCropType("");
        setIssueDescription("");
        
        // Finalize optimistic update with the ACTUAL ID from the server
        const finalizedReport = { ...newReport, id: responseData.id };
        setReports(prev => [finalizedReport, ...prev.filter(r => r.id !== newReport.id)].slice(0, 50));
        
        // Then fetch actual data from server to sync (without loading flicker)
        fetchReports(false);
      } else {
        const data = await response.json();
        setSubmitMessage({ text: data.error || "Failed to submit report.", type: "error" });
      }
    } catch (error) {
      setSubmitMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      const response = await fetch(`/api/intelligence/reports/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setReports(prev => prev.filter(r => r.id !== id));
      } else {
        alert(`Failed to delete report: ${data?.error || `Server returned ${response.status}`}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const startEditing = (report) => {
    setEditingReportId(report.id);
    setEditLocation(report.location);
    setEditCropType(report.cropType || "");
    setEditIssueDescription(report.issueDescription);
  };

  const cancelEditing = () => {
    setEditingReportId(null);
  };

  const handleUpdate = async (id) => {
    try {
      const response = await fetch(`/api/intelligence/reports/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          location: editLocation,
          cropType: editCropType,
          issueDescription: editIssueDescription
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setReports(prev => prev.map(r => 
          r.id === id 
            ? { ...r, location: editLocation, cropType: editCropType, issueDescription: editIssueDescription }
            : r
        ));
        setEditingReportId(null);
      } else {
        alert(`Failed to update report: ${data?.error || `Server returned ${response.status}`}`);
      }
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-split">
          <div>
            <p className="eyebrow">Community Intelligence</p>
            <h1 className="headline-animate">
              The <span style={{ color: "var(--accent)" }}>Waze</span> for agriculture. <br/>
              Anticipate problems before they spread.
            </h1>
          </div>
          <div className="page-hero-visual media-frame">
            <img
              src="/images/community_intel_hero.png"
              alt="Community Intelligence Map and Farmers"
              loading="lazy"
              width={1000}
              height={750}
            />
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: "4rem 0" }}>
        <div className="intelligence-grid">
          {/* Left Column: Report Submission Form */}
          <div className="report-panel card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Submit a Field Report</h2>
              <span className={`status-badge ${isAuthenticated ? 'success' : 'warning'}`}>
                {isAuthenticated ? `Logged in as ${user?.username}` : 'Posting Anonymously'}
              </span>
            </div>
            <p className="text-secondary" style={{ marginBottom: "2rem" }}>
              Help your community. Submit short reports about pests, diseases, soil issues, or drought stress.
            </p>

            <form onSubmit={handleReportSubmit} className="form-layout">
              <div className="form-group">
                <label htmlFor="location">Location (GPS or Village/Region)</label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. North Valley"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cropType">Crop Type (Optional)</label>
                <input
                  id="cropType"
                  type="text"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="e.g. Corn, Wheat"
                />
              </div>

              <div className="form-group">
                <label htmlFor="issueDescription">Issue Description</label>
                <textarea
                  id="issueDescription"
                  name="issueDescription"
                  value={issueDescription || ""}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe pests, diseases, soil issues, etc."
                  rows={4}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ width: "100%" }}
              >
                {isSubmitting ? "Submitting..." : (isAuthenticated ? "Submit Report" : "Submit Anonymous Report")}
              </button>

              {submitMessage.text && (
                <div className={`alert alert-${submitMessage.type}`} style={{ marginTop: "1rem" }}>
                  {submitMessage.text}
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Farmer Reports Dashboard */}
          <div className="dashboard-panel">
            <h2>Live Community Reports</h2>

            {isLoadingReports ? (
              <p>Loading reports...</p>
            ) : reports && reports.length > 0 ? (
              <div className="intelligence-output intel-green-box">
                <div className="reports-list">
                  {reports.map((report) => (
                    <div key={report.id} className={`report-item card ${editingReportId === report.id ? 'editing' : ''}`}>
                      {editingReportId === report.id ? (
                        <div className="edit-form-inline">
                          <input 
                            type="text" 
                            value={editLocation} 
                            onChange={(e) => setEditLocation(e.target.value)} 
                            placeholder="Location"
                          />
                          <input 
                            type="text" 
                            value={editCropType} 
                            onChange={(e) => setEditCropType(e.target.value)} 
                            placeholder="Crop (Optional)"
                          />
                          <textarea 
                            value={editIssueDescription} 
                            onChange={(e) => setEditIssueDescription(e.target.value)} 
                            placeholder="Description"
                            rows={3}
                          />
                          <div className="edit-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(report.id)}>Save</button>
                            <button className="btn btn-secondary btn-sm" onClick={cancelEditing}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="report-item-header">
                            <span className="report-location">
                              {report.location}
                              {user?.id && report.userId && Number(report.userId) === Number(user.id) && <span className="user-badge">You</span>}
                            </span>
                            <div className="report-meta-actions">
                              <span className="report-date">{new Date(report.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                              {user?.id && report.userId && Number(report.userId) === Number(user.id) && (
                                <div className="report-owner-actions">
                                  <button onClick={() => startEditing(report)} className="action-link edit">Edit</button>
                                  <button onClick={() => handleDelete(report.id)} className="action-link delete">Delete</button>
                                </div>
                              )}
                            </div>
                          </div>
                          {report.cropType && (
                            <div className="report-crop">Crop: <strong>{report.cropType}</strong></div>
                          )}
                          <p className="report-desc">{report.issueDescription}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="intelligence-output intel-green-box">
                <p className="text-secondary">No reports found recently. Conditions appear stable.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );

}

export default CommunityIntelligencePage;
