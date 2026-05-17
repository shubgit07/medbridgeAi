"use client";
import { useState } from "react";
// import API from "../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

//   const login = async () => {
//     const res = await API.post("/login", { email, password });
//     localStorage.setItem("token", res.data.access_token);
//     location.href = "/dashboard";
//   };

  return (
    <div>
      <input onChange={e=>setEmail(e.target.value)} placeholder="email"/>
      <input type="password" onChange={e=>setPassword(e.target.value)} />
      <button >Login</button>
    </div>
  );
}