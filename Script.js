let presentCount = 0;
let absentCount = 0;

function addStudent(){

let name = document.getElementById("name").value;
let studentClass = document.getElementById("class").value;

let li = document.createElement("li");

li.innerHTML = name + " - " + studentClass + 
" <button onclick='markPresent(this)'>Present</button>" +
" <button onclick='markAbsent(this)'>Absent</button>" +
" <button onclick='deleteStudent(this)'>Delete</button>" +
" <span class='status'> (Not Marked)</span>";

document.getElementById("studentList").appendChild(li);

updateTotal();

saveData();

}

function markPresent(btn){

btn.parentElement.style.background = "lightgreen";
btn.parentElement.querySelector(".status").innerText = " (Present)";

presentCount++;
updateDashboard();

saveData();

}

function markAbsent(btn){

btn.parentElement.style.background = "lightcoral";
btn.parentElement.querySelector(".status").innerText = " (Absent)";

absentCount++;
updateDashboard();

saveData();

}

function deleteStudent(btn){

btn.parentElement.remove();

updateTotal();

saveData();

}

function updateTotal(){

let total = document.getElementById("studentList").children.length;

document.getElementById("total").innerText = total;

}

function updateDashboard(){

document.getElementById("present").innerText = presentCount;
document.getElementById("absent").innerText = absentCount;

}

function saveData(){

localStorage.setItem("attendanceData", document.getElementById("studentList").innerHTML);

}

function loadData(){

let data = localStorage.getItem("attendanceData");

if(data){
document.getElementById("studentList").innerHTML = data;
}

}

loadData();