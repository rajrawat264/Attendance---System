function addStudent() {

    let roll = document.getElementById("roll").value;
    let name = document.getElementById("name").value;
    let studentClass = document.getElementById("class").value;

    if (roll === "" || name === "" || studentClass === "") {
        alert("Please fill all fields");
        return;
    }

    let li = document.createElement("li");

    li.innerHTML =
        roll + " - " + name + " - " + studentClass +
        ' <button onclick="markPresent(this)">Present</button>' +
        ' <button onclick="markAbsent(this)">Absent</button>' +
        ' <button onclick="deleteStudent(this)">Delete</button>';

    document.getElementById("studentList").appendChild(li);

    document.getElementById("roll").value = "";
    document.getElementById("name").value = "";
    document.getElementById("class").value = "";

    updateDashboard();
}

function markPresent(button) {

    let li = button.parentElement;

    li.style.backgroundColor = "#b6f2b6";
    li.classList.remove("absent");
    li.classList.add("present");

    updateDashboard();
}

function markAbsent(button) {

    let li = button.parentElement;

    li.style.backgroundColor = "#f2b6b6";
    li.classList.remove("present");
    li.classList.add("absent");

    updateDashboard();
}

function deleteStudent(button) {

    let li = button.parentElement;
    li.remove();

    updateDashboard();
}

function updateDashboard() {

    let total = document.querySelectorAll("#studentList li").length;
    let present = document.querySelectorAll("#studentList li.present").length;
    let absent = document.querySelectorAll("#studentList li.absent").length;

    document.getElementById("total").textContent = total;
    document.getElementById("present").textContent = present;
    document.getElementById("absent").textContent = absent;
}
