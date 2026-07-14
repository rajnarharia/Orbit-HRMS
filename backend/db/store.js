// db/store.js
// Data-access helpers layered on top of the JSON file store.

const bcrypt = require('bcryptjs');
const db = require('./jsonDb');

// ---------- Login ID generation ----------
// Format per spec: OI + first 2 letters of first name + first 2 letters of
// last name + year of joining + 4-digit serial number for that year.
// Example: OIJODO20220001
function generateEmployeeCode(fullName, joinDate, data) {
  const parts = fullName.trim().split(/\s+/);
  const first = (parts[0] || 'XX').slice(0, 2).toUpperCase();
  const last = (parts[1] || parts[0] || 'XX').slice(0, 2).toUpperCase();
  const year = new Date(joinDate || Date.now()).getFullYear();
  const sameYearCount = data.users.filter((u) => {
    const uy = new Date(u.dateOfJoining || u.createdAt).getFullYear();
    return uy === year;
  }).length;
  const serial = String(sameYearCount + 1).padStart(4, '0');
  return `OI${first}${last}${year}${serial}`;
}

function generateTempPassword() {
  // Easy to read/type temp password for first login (e.g. Welcome@482913)
  const num = Math.floor(100000 + Math.random() * 900000);
  return `Welcome@${num}`;
}

// ---------- Users ----------
function findUserByEmail(email) {
  const data = db.load();
  return data.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findUserByCode(code) {
  const data = db.load();
  return data.users.find((u) => u.employeeCode.toLowerCase() === String(code).toLowerCase());
}

function findUserById(id) {
  const data = db.load();
  return data.users.find((u) => u.id === Number(id));
}

function listUsers() {
  const data = db.load();
  return data.users;
}

function createUser(fields) {
  const data = db.load();
  const id = db.nextId(data, 'user');
  const now = new Date().toISOString();
  const dateOfJoining = fields.dateOfJoining || now;
  const employeeCode = fields.employeeCode || generateEmployeeCode(fields.name, dateOfJoining, data);
  const passwordPlain = fields.password || generateTempPassword();
  const passwordHash = bcrypt.hashSync(passwordPlain, 10);

  const user = {
    id,
    employeeCode,
    name: fields.name,
    email: fields.email,
    passwordHash,
    mustChangePassword: !!fields.mustChangePassword,
    role: fields.role === 'admin' ? 'admin' : 'employee',
    phone: fields.phone || '',
    department: fields.department || '',
    jobPosition: fields.jobPosition || '',
    manager: fields.manager || '',
    company: fields.company || 'My Company',
    location: fields.location || '',
    dateOfBirth: fields.dateOfBirth || '',
    residingAddress: fields.residingAddress || '',
    personalEmail: fields.personalEmail || '',
    gender: fields.gender || '',
    nationality: fields.nationality || '',
    maritalStatus: fields.maritalStatus || '',
    bankAccountNumber: fields.bankAccountNumber || '',
    bankName: fields.bankName || '',
    ifscCode: fields.ifscCode || '',
    panNo: fields.panNo || '',
    uanNo: fields.uanNo || '',
    dateOfJoining,
    about: fields.about || '',
    skills: fields.skills || [],
    profilePic: fields.profilePic || '',
    createdAt: now
  };
  data.users.push(user);

  // Default leave balances for a new employee
  data.leaveBalances.push({
    userId: id,
    paid: 24,
    sick: 7,
    unpaid: 0
  });

  // Default salary record (all zero until Admin configures it)
  data.salaries.push({
    userId: id,
    wage: 0,
    basicPct: 50,
    hraPctOfBasic: 50,
    standardAllowance: 0,
    performanceBonusPct: 8.33,
    ltaPct: 8.33,
    pfEmployeePct: 12,
    pfEmployerPct: 12,
    professionalTax: 200
  });

  db.save(data);
  return { user, passwordPlain };
}

function updateUser(id, fields, isAdmin) {
  const data = db.load();
  const idx = data.users.findIndex((u) => u.id === Number(id));
  if (idx === -1) return null;

  const employeeEditableFields = ['phone', 'residingAddress', 'profilePic', 'about', 'skills', 'personalEmail'];
  const adminEditableFields = [
    'name', 'email', 'phone', 'department', 'jobPosition', 'manager', 'company',
    'location', 'dateOfBirth', 'residingAddress', 'personalEmail', 'gender',
    'nationality', 'maritalStatus', 'bankAccountNumber', 'bankName', 'ifscCode',
    'panNo', 'uanNo', 'dateOfJoining', 'about', 'skills', 'profilePic', 'role'
  ];
  const allowed = isAdmin ? adminEditableFields : employeeEditableFields;

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      data.users[idx][key] = fields[key];
    }
  }
  db.save(data);
  return data.users[idx];
}

function setPassword(userId, newPlainPassword) {
  const data = db.load();
  const idx = data.users.findIndex((u) => u.id === Number(userId));
  if (idx === -1) return null;
  data.users[idx].passwordHash = bcrypt.hashSync(newPlainPassword, 10);
  data.users[idx].mustChangePassword = false;
  db.save(data);
  return data.users[idx];
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

// ---------- Attendance ----------
function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function getAttendanceForUserOnDate(userId, date) {
  const data = db.load();
  return data.attendance.find((a) => a.userId === Number(userId) && a.date === date);
}

function checkIn(userId) {
  const data = db.load();
  const date = todayStr();
  let record = data.attendance.find((a) => a.userId === Number(userId) && a.date === date);
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5);
  if (record) {
    if (record.checkIn && !record.checkOut) {
      return { error: 'Already checked in. Please check out first.' };
    }
    record.checkIn = timeStr;
    record.checkOut = null;
    record.status = 'Present';
  } else {
    record = {
      id: db.nextId(data, 'attendance'),
      userId: Number(userId),
      date,
      checkIn: timeStr,
      checkOut: null,
      status: 'Present',
      workHours: 0,
      extraHours: 0
    };
    data.attendance.push(record);
  }
  db.save(data);
  return { record };
}

function checkOut(userId) {
  const data = db.load();
  const date = todayStr();
  const record = data.attendance.find((a) => a.userId === Number(userId) && a.date === date);
  if (!record || !record.checkIn || record.checkOut) {
    return { error: 'You must check in before checking out.' };
  }
  const now = new Date();
  record.checkOut = now.toTimeString().slice(0, 5);

  const [inH, inM] = record.checkIn.split(':').map(Number);
  const [outH, outM] = record.checkOut.split(':').map(Number);
  let minutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (minutes < 0) minutes += 24 * 60;
  const hours = Math.round((minutes / 60) * 100) / 100;
  record.workHours = hours;
  const standardDay = 8;
  record.extraHours = hours > standardDay ? Math.round((hours - standardDay) * 100) / 100 : 0;
  record.status = hours >= 4 ? 'Present' : 'Half-day';

  db.save(data);
  return { record };
}

function listAttendanceForUser(userId, month, year) {
  const data = db.load();
  return data.attendance
    .filter((a) => {
      if (a.userId !== Number(userId)) return false;
      if (month === undefined || year === undefined) return true;
      const d = new Date(a.date);
      return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function listAttendanceForDate(date) {
  const data = db.load();
  return data.attendance.filter((a) => a.date === date);
}

function getTodayStatusForUser(userId) {
  const data = db.load();
  const date = todayStr();
  const att = data.attendance.find((a) => a.userId === Number(userId) && a.date === date);
  const onLeave = data.leaves.find(
    (l) => l.userId === Number(userId) && l.status === 'Approved' && l.startDate <= date && l.endDate >= date
  );
  if (onLeave) return 'OnLeave';
  if (att && att.checkIn) return 'Present';
  return 'Absent';
}

// ---------- Leave / Time Off ----------
function getLeaveBalance(userId) {
  const data = db.load();
  return data.leaveBalances.find((b) => b.userId === Number(userId));
}

function applyLeave(userId, fields) {
  const data = db.load();
  const record = {
    id: db.nextId(data, 'leave'),
    userId: Number(userId),
    leaveType: fields.leaveType, // 'Paid', 'Sick', 'Unpaid'
    startDate: fields.startDate,
    endDate: fields.endDate,
    remarks: fields.remarks || '',
    attachment: fields.attachment || '',
    status: 'Pending',
    adminComment: '',
    createdAt: new Date().toISOString()
  };
  data.leaves.push(record);
  db.save(data);
  return record;
}

function listLeavesForUser(userId) {
  const data = db.load();
  return data.leaves.filter((l) => l.userId === Number(userId)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function listAllLeaves() {
  const data = db.load();
  return data.leaves.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function countLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function setLeaveStatus(leaveId, status, adminComment) {
  const data = db.load();
  const idx = data.leaves.findIndex((l) => l.id === Number(leaveId));
  if (idx === -1) return { error: 'Leave request not found' };
  const leave = data.leaves[idx];
  const wasApproved = leave.status === 'Approved';

  leave.status = status;
  leave.adminComment = adminComment || '';

  // Adjust balances when moving into/out of Approved
  const balance = data.leaveBalances.find((b) => b.userId === leave.userId);
  if (balance) {
    const days = countLeaveDays(leave.startDate, leave.endDate);
    const key = leave.leaveType.toLowerCase();
    if (status === 'Approved' && !wasApproved && key in balance) {
      balance[key] = Math.max(0, balance[key] - days);
    }
    if (status !== 'Approved' && wasApproved && key in balance) {
      balance[key] = balance[key] + days;
    }
  }

  db.save(data);
  return { leave };
}

// ---------- Salary ----------
function getSalary(userId) {
  const data = db.load();
  return data.salaries.find((s) => s.userId === Number(userId));
}

function updateSalary(userId, fields) {
  const data = db.load();
  let salary = data.salaries.find((s) => s.userId === Number(userId));
  if (!salary) {
    salary = { userId: Number(userId) };
    data.salaries.push(salary);
  }
  const editable = [
    'wage', 'basicPct', 'hraPctOfBasic', 'standardAllowance',
    'performanceBonusPct', 'ltaPct', 'pfEmployeePct', 'pfEmployerPct', 'professionalTax'
  ];
  for (const key of editable) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      salary[key] = Number(fields[key]);
    }
  }
  db.save(data);
  return salary;
}

// Computes the full salary breakdown from the stored percentage configuration.
function computeSalaryBreakdown(salary) {
  const wage = Number(salary.wage) || 0;
  const basic = round2((salary.basicPct / 100) * wage);
  const hra = round2((salary.hraPctOfBasic / 100) * basic);
  const standardAllowance = round2(Number(salary.standardAllowance) || 0);
  const performanceBonus = round2((salary.performanceBonusPct / 100) * basic);
  const lta = round2((salary.ltaPct / 100) * basic);
  const sumSoFar = basic + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = round2(Math.max(0, wage - sumSoFar));

  const pfEmployee = round2((salary.pfEmployeePct / 100) * basic);
  const pfEmployer = round2((salary.pfEmployerPct / 100) * basic);
  const professionalTax = round2(Number(salary.professionalTax) || 0);

  const grossMonthly = round2(basic + hra + standardAllowance + performanceBonus + lta + fixedAllowance);
  const totalDeductions = round2(pfEmployee + professionalTax);
  const netMonthly = round2(grossMonthly - totalDeductions);

  return {
    wage,
    monthly: {
      basic, hra, standardAllowance, performanceBonus, lta, fixedAllowance,
      grossMonthly, pfEmployee, pfEmployer, professionalTax, totalDeductions, netMonthly
    },
    yearly: {
      wage: round2(wage * 12),
      grossYearly: round2(grossMonthly * 12),
      netYearly: round2(netMonthly * 12)
    },
    config: {
      basicPct: salary.basicPct,
      hraPctOfBasic: salary.hraPctOfBasic,
      performanceBonusPct: salary.performanceBonusPct,
      ltaPct: salary.ltaPct,
      pfEmployeePct: salary.pfEmployeePct,
      pfEmployerPct: salary.pfEmployerPct
    }
  };
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// ---------- Resume ----------
// Note: raw resume text is intentionally NOT persisted in the JSON store —
// only the structured AI-scan output + file metadata. Keeps hrms.json small
// and avoids storing large blobs of unstructured text.
function ensureResumesArray(data) {
  if (!Array.isArray(data.resumes)) data.resumes = [];
  return data.resumes;
}

function saveResumeRecord(userId, fields) {
  const data = db.load();
  const resumes = ensureResumesArray(data);
  const now = new Date().toISOString();

  let record = resumes.find((r) => r.userId === Number(userId));
  if (record) {
    Object.assign(record, fields, { updatedAt: now });
  } else {
    record = {
      id: db.nextId(data, 'resume'),
      userId: Number(userId),
      createdAt: now,
      updatedAt: now,
      ...fields
    };
    resumes.push(record);
  }

  db.save(data);
  return record;
}

function getResumeForUser(userId) {
  const data = db.load();
  ensureResumesArray(data);
  return data.resumes.find((r) => r.userId === Number(userId)) || null;
}

// Merges newly-discovered skills into the user's profile without
// duplicating anything already listed (case-insensitive de-dupe).
function mergeSkillsIntoProfile(userId, newSkills) {
  const data = db.load();
  const idx = data.users.findIndex((u) => u.id === Number(userId));
  if (idx === -1) return null;

  const existing = Array.isArray(data.users[idx].skills) ? data.users[idx].skills : [];
  const seen = new Set(existing.map((s) => String(s).trim().toLowerCase()));
  const merged = [...existing];

  for (const skill of newSkills || []) {
    const clean = String(skill).trim();
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      merged.push(clean);
    }
  }

  data.users[idx].skills = merged;
  db.save(data);
  return data.users[idx];
}

// ---------- Seed ----------
function seedIfEmpty() {
  const data = db.load();
  if (data.users.length > 0) return;

  const { user: admin } = createUser({
    name: 'Alex Admin',
    email: 'admin@hrms.com',
    password: 'Admin@123',
    role: 'admin',
    department: 'Human Resources',
    jobPosition: 'HR Manager',
    company: 'Orbit Industries',
    location: 'Head Office',
    dateOfJoining: '2021-01-04'
  });

  const employees = [
    { name: 'Priya Sharma', email: 'priya.sharma@hrms.com', department: 'Engineering', jobPosition: 'Software Engineer', dateOfJoining: '2022-03-14' },
    { name: 'Rahul Verma', email: 'rahul.verma@hrms.com', department: 'Sales', jobPosition: 'Sales Executive', dateOfJoining: '2023-06-01' },
    { name: 'Sara Khan', email: 'sara.khan@hrms.com', department: 'Design', jobPosition: 'UI/UX Designer', dateOfJoining: '2022-11-20' }
  ];

  for (const e of employees) {
    const { user, passwordPlain } = createUser({
      ...e,
      password: 'Welcome@123',
      role: 'employee',
      manager: admin.name,
      company: 'Orbit Industries',
      location: 'Head Office'
    });
    updateSalary(user.id, {
      wage: 50000, basicPct: 50, hraPctOfBasic: 50, standardAllowance: 4167,
      performanceBonusPct: 8.33, ltaPct: 8.33, pfEmployeePct: 12, pfEmployerPct: 12, professionalTax: 200
    });
  }

  updateSalary(admin.id, {
    wage: 90000, basicPct: 50, hraPctOfBasic: 50, standardAllowance: 5000,
    performanceBonusPct: 8.33, ltaPct: 8.33, pfEmployeePct: 12, pfEmployerPct: 12, professionalTax: 200
  });
}

module.exports = {
  generateEmployeeCode, generateTempPassword,
  findUserByEmail, findUserByCode, findUserById, listUsers, createUser, updateUser, setPassword, sanitizeUser,
  todayStr, checkIn, checkOut, listAttendanceForUser, listAttendanceForDate, getTodayStatusForUser, getAttendanceForUserOnDate,
  getLeaveBalance, applyLeave, listLeavesForUser, listAllLeaves, setLeaveStatus, countLeaveDays,
  getSalary, updateSalary, computeSalaryBreakdown,
  saveResumeRecord, getResumeForUser, mergeSkillsIntoProfile,
  seedIfEmpty
};
