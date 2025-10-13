import React from "react";
import { useAuth } from "../hooks/useAuth";
import SimpleLogin from "../components/SimpleLogin";

const Login = () => {
  const { login } = useAuth();

  return <SimpleLogin onLogin={login} />;
};

export default Login;
