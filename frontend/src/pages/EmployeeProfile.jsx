// src/pages/EmployeeProfile.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext.jsx';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

const TABS = ['Profile', 'Private Info', 'Salary Info', 'Resume & Skills'];

/* ─── Camera SVG Icon ─── */
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function EmployeeProfile({ self = false }) {
  const { id } = useParams();
  const { user: me, refreshUser } = useAuth();
  const targetId = self ? me?.id : Number(id);
  const isSelf = me?.id === targetId;
  const isAdmin = me?.role === 'admin';
  const canEditAll = isAdmin;
  const canEditLimited = isSelf && !isAdmin;

  const [profile, setProfile] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
  const [tab, setTab] = useState('Profile');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);

  function load() {
    if (!targetId) return;
    api.get(`/users/${targetId}`).then(({ data }) => {
      setProfile(data.user);
      setTodayStatus(data.todayStatus);
      setForm(data.user);
    }).catch((e) => setError(e.message));
  }

  function loadResume() {
    if (!targetId) return;
    setResumeLoading(true);
    api.get(`/resume/${targetId}`)
      .then(({ data }) => setResume(data.resume))
      .catch(() => setResume(null)) // 404 just means nothing uploaded yet
      .finally(() => setResumeLoading(false));
  }

  useEffect(load, [targetId]);
  useEffect(loadResume, [targetId]);

  /* ─── Photo Upload Handler ─── */
  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError('');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const query = isAdmin && !isSelf ? `?userId=${targetId}` : '';
      const { data } = await api.post(`/photo/upload${query}`, formData);
      setProfile(data.user);
      setForm(data.user);
      if (isSelf) refreshUser();
      setNotice('Profile photo updated successfully!');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  /* ─── Photo Remove Handler ─── */
  async function handlePhotoRemove() {
    setPhotoUploading(true);
    setPhotoError('');
    try {
      const { data } = await api.delete(`/photo/${targetId}`);
      setProfile(data.user);
      setForm(data.user);
      if (isSelf) refreshUser();
      setNotice('Profile photo removed.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const query = isAdmin && !isSelf ? `?userId=${targetId}` : '';
      // Don't set Content-Type manually — axios auto-generates the correct
      // multipart boundary when the body is a FormData instance. Setting it
      // ourselves here would strip that boundary and break the upload.
      const { data } = await api.post(`/resume/upload${query}`, formData);
      setResume(data.resume);
      setProfile(data.user);
      setForm(data.user);
      if (isSelf) refreshUser();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleResumeDownload() {
    setUploadError('');
    try {
      const response = await api.get(`/resume/${targetId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resume?.originalFileName || 'resume');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setUploadError(err.message);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const endpoint = isSelf ? '/users/me' : `/users/${targetId}`;
      const { data } = await api.put(endpoint, form);
      setProfile(data.user);
      setEditing(false);
      setNotice('Profile updated successfully.');
      if (isSelf) refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <div className="page"><p className="muted">Loading profile…</p></div>;

  const canEdit = canEditAll || canEditLimited;
  const employeeOnlyFields = ['phone', 'residingAddress', 'personalEmail', 'about'];

  function field(label, key, opts = {}) {
    const editableNow = editing && (canEditAll || (canEditLimited && employeeOnlyFields.includes(key)));
    return (
      <div className="detail-field">
        <span className="detail-label">{label}</span>
        {editableNow ? (
          opts.type === 'textarea' ? (
            <textarea value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} rows={3} />
          ) : (
            <input type={opts.type || 'text'} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          )
        ) : (
          <span className="detail-value">{profile[key] || <span className="muted">—</span>}</span>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="profile-header">
        {/* ─── PHOTO UPLOAD: Avatar with camera overlay ─── */}
        <div className="avatar-upload-wrap">
          <span className="avatar-circle xlarge">
            {profile.profilePic ? (
              <img src={profile.profilePic} alt={profile.name} />
            ) : (
              initials(profile.name)
            )}
          </span>
          {canEdit && (
            <label className="avatar-upload-overlay" title="Change photo">
              <CameraIcon />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
              />
            </label>
          )}
        </div>
        <div>
          <h2>{profile.name}</h2>
          <p className="muted">{profile.jobPosition || profile.role} · {profile.department}</p>
          <p className="muted small">Employee ID: {profile.employeeCode}</p>
          {/* Photo action buttons */}
          {canEdit && (
            <div className="photo-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => photoInputRef.current?.click()} disabled={photoUploading}>
                {photoUploading ? 'Uploading...' : profile.profilePic ? 'Change Photo' : 'Upload Photo'}
              </button>
              {profile.profilePic && (
                <button className="btn btn-danger btn-sm" onClick={handlePhotoRemove} disabled={photoUploading}>
                  Remove
                </button>
              )}
            </div>
          )}
          {photoError && <div className="alert alert-error" style={{ marginTop: 8, marginBottom: 0 }}>{photoError}</div>}
        </div>
        {todayStatus && (
          <span className={`status-badge status-${todayStatus === 'Present' ? 'present' : todayStatus === 'OnLeave' ? 'leave' : 'absent'}`}>
            <i /> {todayStatus === 'OnLeave' ? 'On Leave' : todayStatus}
          </span>
        )}
        <div className="spacer" />
        {canEdit && !editing && <button className="btn btn-secondary" onClick={() => { setEditing(true); setForm(profile); }}>Edit</button>}
        {editing && (
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setForm(profile); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="tab-bar">
        {TABS.filter((t) => t !== 'Salary Info' || isAdmin || isSelf).map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="card">
          <div className="detail-grid">
            {field('Full Name', 'name')}
            {field('Mobile', 'phone')}
            {field('Email', 'email')}
            {field('Department', 'department')}
            {field('Job Position', 'jobPosition')}
            {field('Manager', 'manager')}
            {field('Company', 'company')}
            {field('Location', 'location')}
            {field('Date of Joining', 'dateOfJoining', { type: 'date' })}
          </div>
          <div className="detail-field full-width">
            <span className="detail-label">About</span>
            {editing ? (
              <textarea rows={3} value={form.about || ''} onChange={(e) => setForm({ ...form, about: e.target.value })} />
            ) : (
              <p className="detail-value">{profile.about || <span className="muted">No description added yet.</span>}</p>
            )}
          </div>
        </div>
      )}

      {tab === 'Private Info' && (
        <div className="card">
          <div className="detail-grid">
            {field('Date of Birth', 'dateOfBirth', { type: 'date' })}
            {field('Gender', 'gender')}
            {field('Nationality', 'nationality')}
            {field('Marital Status', 'maritalStatus')}
            {field('Residing Address', 'residingAddress')}
            {field('Personal Email', 'personalEmail')}
            {field('PAN No', 'panNo')}
            {field('UAN No', 'uanNo')}
          </div>
          <h4 className="subhead">Bank Details</h4>
          <div className="detail-grid">
            {field('Account Number', 'bankAccountNumber')}
            {field('Bank Name', 'bankName')}
            {field('IFSC Code', 'ifscCode')}
          </div>
        </div>
      )}

      {tab === 'Salary Info' && <SalaryTab userId={targetId} isAdmin={isAdmin} />}

      {tab === 'Resume & Skills' && (
        <div className="card">
          <h4 className="subhead">Skills</h4>
          <div className="skills-row">
            {(profile.skills || []).length === 0 && <span className="muted">No skills added yet.</span>}
            {(profile.skills || []).map((s, i) => <span key={i} className="skill-chip">{s}</span>)}
          </div>
          {editing && canEdit && (
            <input
              placeholder="Comma-separated skills, e.g. React, Node.js, SQL"
              value={(form.skills || []).join(', ')}
              onChange={(e) => setForm({ ...form, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              style={{ marginTop: 8 }}
            />
          )}
          <h4 className="subhead">Resume</h4>
          {uploadError && <div className="alert alert-error">{uploadError}</div>}

          {resumeLoading ? (
            <p className="muted">Loading resume…</p>
          ) : resume ? (
            <div className="card" style={{ background: 'var(--surface-2, #f7f7fb)', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>{resume.originalFileName}</strong>
                  <p className="muted small" style={{ margin: '2px 0 0' }}>
                    Uploaded {new Date(resume.createdAt).toLocaleDateString('en-IN')}
                    {resume.scanStatus === 'failed' ? ' · AI scan failed' : ' · Scanned by AI'}
                  </p>
                </div>
                <div className="btn-group">
                  <button className="btn btn-secondary btn-sm" onClick={handleResumeDownload}>Download</button>
                  {canEdit && (
                    <label className="btn btn-secondary btn-sm" style={{ cursor: uploading ? 'default' : 'pointer' }}>
                      {uploading ? 'Uploading…' : 'Replace'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleResumeUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {resume.scanStatus === 'completed' && (
                <>
                  {resume.summary && <p className="detail-value" style={{ marginTop: 12 }}>{resume.summary}</p>}
                  {resume.totalExperienceYears > 0 && (
                    <p className="muted small">Estimated experience: {resume.totalExperienceYears} yrs</p>
                  )}
                  {resume.highlights?.length > 0 && (
                    <>
                      <h4 className="subhead" style={{ marginTop: 12 }}>Highlights</h4>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {resume.highlights.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </>
                  )}
                </>
              )}
              {resume.scanStatus === 'failed' && (
                <p className="muted small" style={{ marginTop: 8 }}>
                  {resume.scanError || 'AI scanning failed for this resume. You can upload again to retry.'}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="muted">No resume uploaded yet.</p>
              {canEdit && (
                <label className="btn btn-primary btn-sm" style={{ cursor: uploading ? 'default' : 'pointer', display: 'inline-block', marginTop: 8 }}>
                  {uploading ? 'Uploading & scanning…' : 'Upload Resume'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SalaryTab({ userId, isAdmin }) {
  const [breakdown, setBreakdown] = useState(null);
  const [raw, setRaw] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    const endpoint = isAdmin ? `/salary/${userId}` : '/salary/me';
    api.get(endpoint).then(({ data }) => {
      setBreakdown(data.breakdown);
      if (data.raw) { setRaw(data.raw); setForm(data.raw); }
    }).catch((e) => setError(e.message));
  }

  useEffect(load, [userId]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/salary/${userId}`, form);
      setBreakdown(data.breakdown);
      setRaw(data.raw);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!breakdown) return <div className="card"><p className="muted">Loading payroll…</p></div>;
  const m = breakdown.monthly;
  const y = breakdown.yearly;

  return (
    <div className="card">
      {error && <div className="alert alert-error">{error}</div>}
      <div className="salary-header">
        <div>
          <span className="detail-label">Monthly Wage</span>
          {isAdmin && editing ? (
            <input type="number" value={form.wage} onChange={(e) => setForm({ ...form, wage: e.target.value })} style={{ maxWidth: 160 }} />
          ) : (
            <h3>₹ {breakdown.wage.toLocaleString('en-IN')} <span className="muted small">/ month</span></h3>
          )}
        </div>
        <div>
          <span className="detail-label">Yearly Wage</span>
          <h3>₹ {y.wage.toLocaleString('en-IN')} <span className="muted small">/ year</span></h3>
        </div>
        {isAdmin && !editing && <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit Structure</button>}
        {isAdmin && editing && (
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setForm(raw); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>

      <h4 className="subhead">Salary Components (per month)</h4>
      <table className="salary-table">
        <tbody>
          <SalaryRow label="Basic Salary" value={m.basic} pctField="basicPct" form={form} setForm={setForm} editing={editing && isAdmin} suffix="% of wage" />
          <SalaryRow label="House Rent Allowance" value={m.hra} pctField="hraPctOfBasic" form={form} setForm={setForm} editing={editing && isAdmin} suffix="% of basic" />
          <SalaryRow label="Standard Allowance" value={m.standardAllowance} amountField="standardAllowance" form={form} setForm={setForm} editing={editing && isAdmin} />
          <SalaryRow label="Performance Bonus" value={m.performanceBonus} pctField="performanceBonusPct" form={form} setForm={setForm} editing={editing && isAdmin} suffix="% of basic" />
          <SalaryRow label="Leave Travel Allowance" value={m.lta} pctField="ltaPct" form={form} setForm={setForm} editing={editing && isAdmin} suffix="% of basic" />
          <tr><td>Fixed Allowance</td><td className="muted small">Wage − sum of components</td><td className="num">₹ {m.fixedAllowance.toLocaleString('en-IN')}</td></tr>
          <tr className="total-row"><td colSpan={2}>Gross Monthly Salary</td><td className="num">₹ {m.grossMonthly.toLocaleString('en-IN')}</td></tr>
        </tbody>
      </table>

      <h4 className="subhead">Deductions</h4>
      <table className="salary-table">
        <tbody>
          <SalaryRow label="Provident Fund (Employee)" value={m.pfEmployee} pctField="pfEmployeePct" form={form} setForm={setForm} editing={editing && isAdmin} suffix="% of basic" />
          <SalaryRow label="Provident Fund (Employer)" value={m.pfEmployer} pctField="pfEmployerPct" form={form} setForm={setForm} editing={editing && isAdmin} suffix="% of basic" note="company cost" />
          <SalaryRow label="Professional Tax" value={m.professionalTax} amountField="professionalTax" form={form} setForm={setForm} editing={editing && isAdmin} />
          <tr className="total-row"><td colSpan={2}>Total Deductions</td><td className="num">₹ {m.totalDeductions.toLocaleString('en-IN')}</td></tr>
        </tbody>
      </table>

      <div className="net-pay-banner">
        <div><span className="muted">Net Monthly Pay</span><h3>₹ {m.netMonthly.toLocaleString('en-IN')}</h3></div>
        <div><span className="muted">Net Yearly Pay</span><h3>₹ {y.netYearly.toLocaleString('en-IN')}</h3></div>
      </div>
      {!isAdmin && <p className="field-hint">Payroll details are read-only. Contact HR for any corrections.</p>}
    </div>
  );
}

function SalaryRow({ label, value, pctField, amountField, form, setForm, editing, suffix, note }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="muted small">
        {editing && pctField && (
          <>
            <input
              type="number" step="0.01"
              value={form[pctField] ?? ''}
              onChange={(e) => setForm({ ...form, [pctField]: e.target.value })}
              style={{ width: 70 }}
            /> {suffix} {note && <em>({note})</em>}
          </>
        )}
        {editing && amountField && (
          <>
            ₹ <input
              type="number" step="0.01"
              value={form[amountField] ?? ''}
              onChange={(e) => setForm({ ...form, [amountField]: e.target.value })}
              style={{ width: 90 }}
            /> / month
          </>
        )}
        {!editing && suffix && `${form[pctField] ?? ''}${suffix}`}
      </td>
      <td className="num">₹ {Number(value).toLocaleString('en-IN')}</td>
    </tr>
  );
}
