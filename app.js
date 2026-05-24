// =============================================
//  FIREBASE CONFIG
//  ⚠️ Add Firebase Security Rules before going live!
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyB9WOvs0Ryr3TEpujroDzgb0xJTwESv_FU",
  authDomain: "attendance-management-sy-41cce.firebaseapp.com",
  projectId: "attendance-management-sy-41cce",
  storageBucket: "attendance-management-sy-41cce.appspot.com",
  messagingSenderId: "412941065745",
  appId: "1:412941065745:web:5e8ed28e6784463e691bb0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// =============================================
//  STATE
// =============================================
let students        = [];   // live mirror of Firestore
let deletedStudent  = null; // for undo
let unsubscribe     = null; // Firestore listener handle

// =============================================
//  HELPERS
// =============================================

// Today as dd/mm/yyyy  →  stored in Firestore as dd_mm_yyyy
function todayKey()       { return new Date().toLocaleDateString("en-GB"); }
function toFireKey(d)     { return d.replace(/\//g, "_"); }   // dd/mm/yyyy → dd_mm_yyyy
function fromFireKey(k)   { return k.replace(/_/g, "/"); }   // dd_mm_yyyy → dd/mm/yyyy

function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = `show t-${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ""; }, 3000);
}

// =============================================
//  AUTH
// =============================================
function logout() {
  if (unsubscribe) unsubscribe();
  auth.signOut().then(() => window.location.href = "index.html");
}

// =============================================
//  FIRESTORE REAL-TIME LISTENER
//  Each teacher's data: /users/{uid}/students/{docId}
// =============================================
function startListener(uid) {
  unsubscribe = db
    .collection("users").doc(uid)
    .collection("students")
    .orderBy("createdAt", "asc")
    .onSnapshot(snap => {
      students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      display();
    }, err => {
      toast("Database error: " + err.message, "error");
    });
}

// =============================================
//  ADD STUDENT
// =============================================
function addStudent() {
  const roll = document.getElementById("roll").value.trim();
  const name = document.getElementById("studentName").value.trim();
  const cls  = document.getElementById("class").value.trim();

  if (!roll || !name || !cls) {
    return toast("Please fill Roll No, Name and Class.", "error");
  }

  if (students.some(s => s.roll === roll)) {
    return toast(`Roll No ${roll} already exists!`, "error");
  }

  const uid = auth.currentUser.uid;
  db.collection("users").doc(uid).collection("students").add({
    roll, name, cls,
    attendance: {},
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById("roll").value        = "";
    document.getElementById("studentName").value = "";
    document.getElementById("class").value       = "";
    toast(`${name} added successfully!`, "success");
  }).catch(err => toast(err.message, "error"));
}

// =============================================
//  MARK ATTENDANCE
// =============================================
function mark(docId, status) {
  const uid   = auth.currentUser.uid;
  const fkey  = toFireKey(todayKey()); // e.g. 26_04_2026
  db.collection("users").doc(uid).collection("students").doc(docId)
    .update({ [`attendance.${fkey}`]: status })
    .then(() => toast(`Marked ${status}`, status === "Present" ? "success" : "error"))
    .catch(err => toast(err.message, "error"));
}

// =============================================
//  DELETE & UNDO
// =============================================
function del(docId) {
  deletedStudent = students.find(s => s.id === docId);
  const uid = auth.currentUser.uid;
  db.collection("users").doc(uid).collection("students").doc(docId)
    .delete()
    .then(() => toast("Student deleted. Click Undo to restore.", "info"))
    .catch(err => toast(err.message, "error"));
}

function undoDelete() {
  if (!deletedStudent) return toast("Nothing to undo.", "error");
  const uid = auth.currentUser.uid;
  const { id, ...data } = deletedStudent;
  db.collection("users").doc(uid).collection("students").doc(id)
    .set(data)
    .then(() => {
      deletedStudent = null;
      toast("Student restored!", "success");
    })
    .catch(err => toast(err.message, "error"));
}

// =============================================
//  SEARCH
// =============================================
function searchStudent() {
  const val = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!val) return toast("Enter a search term.", "error");
  const filtered = students.filter(s =>
    s.roll.toLowerCase().includes(val) || s.name.toLowerCase().includes(val)
  );
  display(filtered);
}

function resetSearch() {
  document.getElementById("searchInput").value = "";
  display();
}

// =============================================
//  ATTENDANCE % CALCULATION
// =============================================
function calcPercent(attendance) {
  if (!attendance || !Object.keys(attendance).length) return null;
  const vals  = Object.values(attendance);
  const total = vals.length;
  const p     = vals.filter(v => v === "Present").length;
  return Math.round((p / total) * 100);
}

function pctColor(pct) {
  if (pct >= 75) return "#16a34a";
  if (pct >= 50) return "#ea580c";
  return "#dc2626";
}

// =============================================
//  DISPLAY TABLE
// =============================================
function display(list = students) {
  const tbody  = document.getElementById("tableBody");
  if (!tbody) return;

  const today  = todayKey();
  const fkey   = toFireKey(today);
  let pCount = 0, aCount = 0;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty">No students found.</div></td></tr>`;
    updateStats(0, 0, 0);
    return;
  }

  tbody.innerHTML = list.map(s => {
    const att    = s.attendance || {};
    const status = att[fkey] || "--";

    if (status === "Present") pCount++;
    if (status === "Absent")  aCount++;

    const badgeCls = status === "Present" ? "badge-present"
                   : status === "Absent"  ? "badge-absent"
                   : "badge-none";

    const pct   = calcPercent(att);
    const color = pct !== null ? pctColor(pct) : "#94a3b8";
    const fill  = pct !== null ? pct : 0;
    const label = pct !== null ? `${pct}%` : "N/A";

    const isLow = pct !== null && pct < 75;
    const rowStyle = isLow ? "background:#fff5f5;" : "";
    const warnBadge = isLow ? `<span class="badge-warning">⚠️ Low</span>` : "";

    return `
    <tr style="${rowStyle}">
      <td style="font-size:12px;color:#475569">${today}</td>
      <td style="font-weight:bold;color:#007bff">${s.roll}</td>
      <td style="font-weight:600">${s.name}${warnBadge}</td>
      <td style="color:#475569">${s.cls}</td>
      <td><span class="badge ${badgeCls}">${status}</span></td>
      <td>
        <div class="td-actions">
          <button class="btn-present" onclick="mark('${s.id}','Present')">P</button>
          <button class="btn-absent"  onclick="mark('${s.id}','Absent')">A</button>
          <button class="btn-delete"  onclick="del('${s.id}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  updateStats(list.length, pCount, aCount);
  checkLowAttendance(list);
}

function updateStats(total, present, absent) {
  const t = document.getElementById("total");
  const p = document.getElementById("present");
  const a = document.getElementById("absent");
  if (t) t.textContent = total;
  if (p) p.textContent = present;
  if (a) a.textContent = absent;
}

// =============================================
//  MONTHLY % MODAL
// =============================================
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function showMonthlyPercentage() {
  if (!students.length) return toast("No students to show.", "error");

  const body = document.getElementById("modalBody");

  body.innerHTML = students.map(s => {
    const att = s.attendance || {};

    // Group by month
    const months = {};
    for (const [key, val] of Object.entries(att)) {
      // key format: dd_mm_yyyy
      const parts = key.split("_");
      if (parts.length < 3) continue;
      const label = `${MONTHS[parseInt(parts[1]) - 1]} ${parts[2]}`;
      if (!months[label]) months[label] = { p: 0, total: 0 };
      months[label].total++;
      if (val === "Present") months[label].p++;
    }

    const monthRows = Object.entries(months).map(([m, data]) => {
      const pct = Math.round((data.p / data.total) * 100);
      const cls = pct >= 75 ? "pct-good" : pct >= 50 ? "pct-warn" : "pct-bad";
      return `<div class="month-row">
        <div>
          <div class="month-name">${m}</div>
          <div class="month-sub">${data.p} present / ${data.total} days</div>
        </div>
        <div class="pct-big ${cls}">${pct}%</div>
      </div>`;
    }).join("") || `<p style="color:#94a3b8;font-size:13px">No attendance recorded yet.</p>`;

    const overall = calcPercent(att);
    const overallBadge = overall !== null
      ? `<span class="badge ${overall >= 75 ? "badge-present" : "badge-absent"}">${overall}% overall</span>`
      : "";

    return `<div class="student-block">
      <div class="student-title">
        <span><b>${s.roll}</b> — ${s.name} (${s.cls})</span>
        ${overallBadge}
      </div>
      ${monthRows}
    </div>`;
  }).join("");

  document.getElementById("overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("overlay").classList.remove("open");
}

// =============================================
//  BULK IMPORT FROM CSV
//  CSV format: Roll No, Name, Class (one per line)
//  Example:
//  2201680,Raj,B.Tech CSE - B
//  2201681,Rahul,B.Tech CSE - B
// =============================================
function bulkImport() {
  const input = document.getElementById("csvFile");
  if (!input || !input.files.length) {
    return toast("Please select a CSV file first.", "error");
  }

  const file = input.files[0];
  if (!file.name.endsWith(".csv")) {
    return toast("Please upload a .csv file only.", "error");
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split("\n").filter(l => l.trim());
    const uid   = auth.currentUser.uid;

    let added   = 0;
    let skipped = 0;
    let errors  = 0;

    // Always skip first row as it is the header row
    const startIndex = 1;

    // Collect all valid new student records
    const newStudents = [];
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim());
      if (parts.length < 3) { errors++; continue; }

      const roll = parts[0];
      const name = parts[1];
      // Class is optional — use "N/A" if not provided
      const cls  = parts.length >= 3 ? parts.slice(2).join(",").trim() : "N/A";

      if (!roll || !name) { errors++; continue; }

      // Skip duplicates already in Firestore
      if (students.some(s => s.roll === roll)) { skipped++; continue; }

      // Skip duplicates within this CSV itself
      if (newStudents.some(s => s.roll === roll)) { skipped++; continue; }

      newStudents.push({ roll, name, cls });
      added++;
    }

    if (added === 0) {
      return toast("No new students to add. Skipped: " + skipped + " duplicates.", "error");
    }

    // Firebase allows max 500 writes per batch
    // Split into multiple batches to support unlimited students
    const BATCH_SIZE = 500;
    const batches = [];

    for (let i = 0; i < newStudents.length; i += BATCH_SIZE) {
      const chunk = newStudents.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach(s => {
        const ref = db.collection("users").doc(uid).collection("students").doc();
        batch.set(ref, {
          roll: s.roll,
          name: s.name,
          cls:  s.cls,
          attendance: {},
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      batches.push(batch);
    }

    // Commit all batches — supports any number of students
    Promise.all(batches.map(b => b.commit()))
      .then(() => {
        input.value = "";
        document.getElementById("csvFileName").textContent = "No file chosen";
        let msg = added + " students added successfully!";
        if (skipped > 0) msg += " (" + skipped + " duplicates skipped)";
        if (errors  > 0) msg += " (" + errors  + " rows had errors)";
        toast(msg, "success");
        closeBulkModal();
      })
      .catch(err => toast("Import failed: " + err.message, "error"));
  };

  reader.readAsText(file);
}

function openBulkModal() {
  document.getElementById("bulkOverlay").classList.add("open");
}

function closeBulkModal() {
  document.getElementById("bulkOverlay").classList.remove("open");
  const input = document.getElementById("csvFile");
  if (input) input.value = "";
  const label = document.getElementById("csvFileName");
  if (label) label.textContent = "No file chosen";
}

function handleFileSelect(input) {
  const label = document.getElementById("csvFileName");
  if (input.files.length > 0) {
    label.textContent = input.files[0].name;
  } else {
    label.textContent = "No file chosen";
  }
}

function downloadSampleCSV() {
  const sample = "Roll No,Name,Class\n2201680,Raj,B.Tech CSE - B\n2201681,Rahul,B.Tech CSE - B\n2201682,Priya,B.Tech CSE - B\n2201683,Rishi,B.Tech CSE - B\n2201684,Sarup,B.Tech CSE - B";
  const blob = new Blob([sample], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "sample_students.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast("Sample CSV downloaded!", "success");
}

// =============================================
//  MARK ALL PRESENT / ABSENT
// =============================================
function markAll(status) {
  if (!students.length) return toast("No students to mark.", "error");

  const uid   = auth.currentUser.uid;
  const fkey  = toFireKey(todayKey());
  const BATCH_SIZE = 500;
  const batches = [];

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const chunk = students.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(s => {
      const ref = db.collection("users").doc(uid).collection("students").doc(s.id);
      batch.update(ref, { [`attendance.${fkey}`]: status });
    });
    batches.push(batch);
  }

  Promise.all(batches.map(b => b.commit()))
    .then(() => toast(`All students marked ${status}!`, status === "Present" ? "success" : "error"))
    .catch(err => toast(err.message, "error"));
}

// =============================================
//  EXPORT TO EXCEL (CSV format)
// =============================================
function exportToExcel() {
  if (!students.length) return toast("No students to export.", "error");

  // Get all unique dates from all students
  const allDates = new Set();
  students.forEach(s => {
    Object.keys(s.attendance || {}).forEach(k => allDates.add(k));
  });

  // Sort dates chronologically
  const sortedDates = Array.from(allDates).sort((a, b) => {
    const [da, ma, ya] = a.split("_").map(Number);
    const [db2, mb, yb] = b.split("_").map(Number);
    return new Date(ya, ma-1, da) - new Date(yb, mb-1, db2);
  });

  // Build CSV header
  const dateHeaders = sortedDates.map(d => d.replace(/_/g, "/"));
  const header = ["Roll No", "Name", "Class", ...dateHeaders, "Total Present", "Total Days", "Attendance %"];

  // Build rows
  const rows = students.map(s => {
    const att    = s.attendance || {};
    const vals   = sortedDates.map(d => att[d] || "--");
    const total  = Object.values(att).length;
    const present = Object.values(att).filter(v => v === "Present").length;
    const pct    = total > 0 ? Math.round((present / total) * 100) + "%" : "N/A";
    return [s.roll, s.name, s.cls, ...vals, present, total, pct];
  });

  // Convert to CSV string
  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(","))
    .join("\n");

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const today = todayKey().replace(/\//g, "-");
  a.href     = url;
  a.download = `Attendance_Report_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Attendance exported successfully!", "success");
}

// =============================================
//  LOW ATTENDANCE ALERT
// =============================================
function checkLowAttendance(list) {
  const lowStudents = list.filter(s => {
    const pct = calcPercent(s.attendance || {});
    return pct !== null && pct < 75;
  });

  const alertBox = document.getElementById("lowAttendanceAlert");
  if (!alertBox) return;

  if (lowStudents.length > 0) {
    alertBox.style.display = "block";
    alertBox.innerHTML = `⚠️ <b>${lowStudents.length} student${lowStudents.length > 1 ? "s" : ""}</b> below 75% attendance: ${lowStudents.map(s => `<b>${s.name}</b> (${calcPercent(s.attendance)}%)`).join(", ")}`;
  } else {
    alertBox.style.display = "none";
  }
}

// =============================================
//  EDIT STUDENT
// =============================================
function openEditModal(docId) {
  const s = students.find(st => st.id === docId);
  if (!s) return;

  document.getElementById("editDocId").value  = docId;
  document.getElementById("editRoll").value   = s.roll;
  document.getElementById("editName").value   = s.name;
  document.getElementById("editClass").value  = s.cls;
  document.getElementById("editOverlay").classList.add("open");
}

function closeEditModal() {
  document.getElementById("editOverlay").classList.remove("open");
}

function saveEdit() {
  const docId = document.getElementById("editDocId").value;
  const roll  = document.getElementById("editRoll").value.trim();
  const name  = document.getElementById("editName").value.trim();
  const cls   = document.getElementById("editClass").value.trim();

  if (!roll || !name || !cls) return toast("Please fill all fields.", "error");

  // Check duplicate roll (excluding current student)
  if (students.some(s => s.roll === roll && s.id !== docId)) {
    return toast("Roll No " + roll + " already exists!", "error");
  }

  const uid = auth.currentUser.uid;
  db.collection("users").doc(uid).collection("students").doc(docId)
    .update({ roll, name, cls })
    .then(() => {
      toast(name + " updated successfully!", "success");
      closeEditModal();
    })
    .catch(err => toast(err.message, "error"));
}