fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin_1", password: "adm@2024" })
})
.then(res => res.json())
.then(data => console.log("Login:", data))
.catch(console.error);
