<script src="./bootstrap/js/bootstrap.bundle.min.js"></script>

const form = document.getElementById("addEmployeeForm");

form.addEventListener("submit", function(e){
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const birthday = document.getElementById("birthday").value;
    const status = document.getElementById("status").value;

    if(!firstName || !lastName || !birthday || !status){
        alert("Please fill all fields");
        return;
    }

    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    // ==================== GENERATE EMPLOYEE ID ====================
    function generateEmployeeID() {
        let total = employees.length + 1;
        let group = Math.ceil(total / 10);
        let position = total % 10;
        if (position === 0) position = 10;
        let groupFormatted = String(group).padStart(3,'0');
        let positionFormatted = String(position).padStart(2,'0');
        return `E${groupFormatted}-${positionFormatted}`;
    }

    const newEmployee = {
        id: generateEmployeeID(),
        firstName: firstName,
        lastName: lastName,
        birthday: birthday,
        status: status
    };

    employees.push(newEmployee);
    localStorage.setItem("employees", JSON.stringify(employees));

    // Log activity
    if(typeof logActivity === "function"){
        logActivity("Added Employee", `${firstName} ${lastName}`);
    }

    alert("Employee added successfully!");
    window.location.href = "employee_list.html";
});