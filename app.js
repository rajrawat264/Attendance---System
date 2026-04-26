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

let students       = [];
let deletedStudent = null;
let unsubscribe    = null;

function todayKey()   { return new Date().toLocaleDateString("en-GB"); }
function toFireKey(d) { return d.replace(/\//g, "_"); }

function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "show t-" + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ""; }, 3000);
}

function logout() {
  if (unsubscribe) unsubscribe();
  auth.signOut().then(() => window.location.href = "index.html");
}

function startListener(uid) {
  unsubscribe = db.collection("users").doc(uid).collection("students")
    .orderBy("createdAt", "asc")
    .onSnapshot(snap => {
      students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      display();
    }, err => toast("Database error: " + err.message, "error"));
}

function addStudent() {
  const roll = document.getElementById("roll").value.trim();
  const name = document.getElementById("studentName").value.trim();
  const cls  = document.getElementById("class").value.trim();
  if (!roll || !name || !cls) return toast("Please fill all fields.", "error");
  if (students.some(s => s.roll === roll)) return toast("Roll No " + roll + " already exists!", "error");
  const uid = auth.currentUser.uid;
  db.collection("users").doc(uid).collection("students").add({
    roll, name, cls, attendance: {},
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById("roll").value = "";
    document.getElementById("studentName").value = "";
    document.getElementById("class").value = "";
    toast(name + " added!", "success");
  }).catch(err => toast(err.message, "error"));
}

function mark(docId, status) {
  const uid  = auth.currentUser.uid;
  const fkey = toFireKey(todayKey());
  db.collection("users").doc(uid).collection("students").doc(docId)
    .update({ ["attendance." + fkey]: status })
    .then(() => toast("Marked " + status, status === "Present" ? "success" : "error"))
    .catch(err => toast(err.message, "error"));
}

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
    .then(() => { deletedStudent = null; toast("Student restored!", "success"); })
    .catch(err => toast(err.message, "error"));
}

function searchStudent() {
  const val = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!val) return toast("Enter a search term.", "error");
  display(students.filter(s => s.roll.toLowerCase().includes(val) || s.name.toLowerCase().includes(val)));
}

function resetSearch() {
  document.getElementById("searchInput").value = "";
  display();
}

function calcPercent(attendance) {
  if (!attendance || !Object.keys(attendance).length) return null;
  const vals = Object.values(attendance);
  return Math.round((vals.filter(v => v === "Present").length / vals.length) * 100);
}

function pctColor(pct) {
  return pct >= 75 ? "#16a34a" : pct >= 50 ? "#ea580c" : "#dc2626";
}

function display(list = students) {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;
  const today = todayKey();
  const fkey  = toFireKey(today);
  let pCount = 0, aCount = 0;

  if (!list.length) {
    tbody.innerHTML = "<tr><td colspan='7'><div class='empty'>No students found.</div></td></tr>";
    updateStats(0, 0, 0);
    return;
  }

  tbody.innerHTML = list.map(s => {
    const att    = s.attendance || {};
    const status = att[fkey] || "--";
    if (status === "Present") pCount++;
    if (status === "Absent")  aCount++;
    const badgeCls = status === "Present" ? "badge-present" : status === "Absent" ? "badge-absent" : "badge-none";
    const pct   = calcPercent(att);
    const color = pct !== null ? pctColor(pct) : "#94a3b8";
    const fill  = pct !== null ? pct : 0;
    const label = pct !== null ? pct + "%" : "N/A";
    return "<tr>" +
      "<td style='font-size:12px;color:#475569'>" + today + "</td>" +
      "<td style='font-weight:bold;color:#007bff'>" + s.roll + "</td>" +
      "<td style='font-weight:600'>" + s.name + "</td>" +
      "<td style='color:#475569'>" + s.cls + "</td>" +
      "<td><span class='badge " + badgeCls + "'>" + status + "</span></td>" +
      "<td><div class='td-actions'>" +
        "<button class='btn-present' onclick=\"mark('" + s.id + "','Present')\">P</button>" +
        "<button class='btn-absent' onclick=\"mark('" + s.id + "','Absent')\">A</button>" +
        "<button class='btn-delete' onclick=\"del('" + s.id + "')\">Del</button>" +
      "</div></td>" +
      "<td><div class='pct-wrap'><div class='pct-track'><div class='pct-fill' style='width:" + fill + "%;background:" + color + "'></div></div><span class='pct-text' style='color:" + color + "'>" + label + "</span></div></td>" +
    "</tr>";
  }).join("");
  updateStats(list.length, pCount, aCount);
}

function updateStats(total, present, absent) {
  const t = document.getElementById("total");
  const p = document.getElementById("present");
  const a = document.getElementById("absent");
  if (t) t.textContent = total;
  if (p) p.textContent = present;
  if (a) a.textContent = absent;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function showMonthlyPercentage() {
  if (!students.length) return toast("No students to show.", "error");
  const body = document.getElementById("modalBody");
  body.innerHTML = students.map(s => {
    const att = s.attendance || {};
    const months = {};
    for (const [key, val] of Object.entries(att)) {
      const parts = key.split("_");
      if (parts.length < 3) continue;
      const label = MONTHS[parseInt(parts[1]) - 1] + " " + parts[2];
      if (!months[label]) months[label] = { p: 0, total: 0 };
      months[label].total++;
      if (val === "Present") months[label].p++;
    }
    const monthRows = Object.entries(months).map(([m, data]) => {
      const pct = Math.round((data.p / data.total) * 100);
      const cls = pct >= 75 ? "pct-good" : pct >= 50 ? "pct-warn" : "pct-bad";
      return "<div class='month-row'><div><div class='month-name'>" + m + "</div><div class='month-sub'>" + data.p + " present / " + data.total + " days</div></div><div class='pct-big " + cls + "'>" + pct + "%</div></div>";
    }).join("") || "<p style='color:#94a3b8;font-size:13px'>No attendance recorded yet.</p>";
    const overall = calcPercent(att);
    const badge = overall !== null ? "<span class='badge " + (overall >= 75 ? "badge-present" : "badge-absent") + "'>" + overall + "% overall</span>" : "";
    return "<div class='student-block'><div class='student-title'><span>" + s.roll + " - " + s.name + " (" + s.cls + ")</span>" + badge + "</div>" + monthRows + "</div>";
  }).join("");
  document.getElementById("overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("overlay").classList.remove("open");
}