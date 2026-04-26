// Firebase config
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

// SIGN UP
function signUp() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => alert("Signup Successful"))
    .catch(err => alert(err.message));
}

// LOGIN
function login() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("Login Successful");
      window.location.href = "attendance.html";
    })
    .catch(err => alert(err.message));
}

// LOGOUT
function logout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}

// ADD STUDENT
function addStudent() {
  let roll = document.getElementById("roll").value;
  let name = document.getElementById("name").value;
  let cls = document.getElementById("class").value;

  let table = document.getElementById("table");

  let row = table.insertRow();
  let date = new Date().toLocaleDateString("en-GB");

  row.innerHTML = `
    <td>${date}</td>
    <td>${roll}</td>
    <td>${name}</td>
    <td>${cls}</td>
    <td>--</td>
    <td>
      <button class="present" onclick="markPresent(this)">Present</button>
      <button class="absent" onclick="markAbsent(this)">Absent</button>
      <button class="delete" onclick="deleteRow(this)">Delete</button>
    </td>
  `;
}

// MARK PRESENT
function markPresent(btn) {
  let row = btn.parentElement.parentElement;
  row.cells[4].innerText = "Present";
  row.className = "presentRow";
}

// MARK ABSENT
function markAbsent(btn) {
  let row = btn.parentElement.parentElement;
  row.cells[4].innerText = "Absent";
  row.className = "absentRow";
}

// DELETE
function deleteRow(btn) {
  btn.parentElement.parentElement.remove();
}