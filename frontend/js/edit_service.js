const employee = JSON.parse(localStorage.getItem("currentEmployee"));
let services = JSON.parse(localStorage.getItem("services")) || [];
const editIndex = localStorage.getItem("editServiceIndex");

if(editIndex === null){
    alert("No service selected to edit.");
    window.location.href = "service_records.html";
}

// Pre-fill input fields
const s = services[editIndex];
document.getElementById("position").value = s.position;
document.getElementById("start").value = s.start;
document.getElementById("end").value = s.end;

// Go back
function goBack(){
    window.location.href = "service_records.html";
}

// Update
function updateService(){
    const position = document.getElementById("position").value;
    const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;

    if(!position || !start || !end){
        alert("Please complete the form");
        return;
    }

    services[editIndex] = {
        id: employee.id,
        position: position,
        start: start,
        end: end
    };

    localStorage.setItem("services", JSON.stringify(services));
    alert("Service Record Updated");
    window.location.href = "service_record.html";
}

<script src="./bootstrap/js/bootstrap.bundle.min.js"></script>