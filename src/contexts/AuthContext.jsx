import { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Función para verificar y restaurar la sesión
    const checkAuth = async () => {
      try {
        // Verificar si localStorage está disponible (iOS puede bloquearlo)
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          console.warn('localStorage no disponible');
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Verificar si hay token guardado
        let token, user;
        try {
          token = localStorage.getItem('token');
          user = localStorage.getItem('user');
        } catch (storageError) {
          console.error('Error al acceder a localStorage:', storageError);
          // Si localStorage falla, continuar como no autenticado
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }
        
        if (token && user) {
          try {
            const userData = JSON.parse(user);
            
            // Validar que los datos sean válidos
            if (userData && typeof userData === 'object') {
              // Asegurar que el modulo esté en localStorage
              if (userData.modulo) {
                localStorage.setItem('modulo', userData.modulo);
              }
              
              // Restaurar el estado de autenticación
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  token,
                  user: userData,
                },
              });
              return;
            }
          } catch (parseError) {
            console.error('Error al parsear datos de usuario:', parseError);
            // Si hay error al parsear, limpiar datos corruptos
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('modulo');
          }
        }
        
        // Si no hay token o hay error, marcar como no autenticado
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        // En caso de cualquier error, limpiar y marcar como no autenticado
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('modulo');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Guardar token y usuario en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Guardar modulo por separado para fácil acceso
      if (user.modulo) {
        localStorage.setItem('modulo', user.modulo);
      }
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { token, user },
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al iniciar sesión',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrarse',
      };
    }
  };

  const logout = () => {
    localStorage.clear(); // Limpiar todo el localStorage
    dispatch({ type: 'LOGOUT' });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
