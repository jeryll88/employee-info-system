const attendanceRoutes = require("./routes/attendance");
const payrollRoutes = require("./routes/payroll");

app.use("/api/attendance", attendanceRoutes);
app.use("/api/payroll", payrollRoutes);

app.listen(3000, () => console.log("Server running on port 3000"));