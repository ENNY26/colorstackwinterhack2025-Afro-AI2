import React from 'react';

const AuthContext = React.createContext({
  setIsAuthenticated: () => {},
});

export const useAuth = () => React.useContext(AuthContext);

export default AuthContext;
