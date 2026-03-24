function logActivity(activity, employee){

let activities = JSON.parse(localStorage.getItem("activities")) || [];

const newActivity = {
    id: activities.length + 1,
    activity: activity,
    employee: employee,
    date: new Date().toLocaleString()
};

activities.unshift(newActivity);

localStorage.setItem("activities", JSON.stringify(activities));

}