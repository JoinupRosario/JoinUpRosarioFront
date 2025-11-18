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
      // Asegurar que estamos en el navegador antes de acceder a localStorage
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.warn('localStorage no disponible, marcando como no autenticado');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      try {
        // Función auxiliar para acceder a localStorage de forma segura (iOS compatible)
        const safeGetItem = (key) => {
          try {
            return localStorage.getItem(key);
          } catch (e) {
            console.warn(`No se pudo acceder a localStorage (${key}):`, e.message);
            return null;
          }
        };

        const safeSetItem = (key, value) => {
          try {
            localStorage.setItem(key, value);
            return true;
          } catch (e) {
            console.warn(`No se pudo escribir en localStorage (${key}):`, e.message);
            return false;
          }
        };

        const safeRemoveItem = (key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`No se pudo eliminar de localStorage (${key}):`, e.message);
          }
        };

        // Verificar si hay token guardado
        const token = safeGetItem('token');
        const user = safeGetItem('user');
        
        if (token && user) {
          try {
            const userData = JSON.parse(user);
            
            // Validar que los datos sean válidos
            if (userData && typeof userData === 'object') {
              // Asegurar que el modulo esté en localStorage
              if (userData.modulo) {
                safeSetItem('modulo', userData.modulo);
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
            safeRemoveItem('token');
            safeRemoveItem('user');
            safeRemoveItem('modulo');
          }
        }
        
        // Si no hay token o hay error, marcar como no autenticado
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        // En caso de cualquier error, marcar como no autenticado (sin intentar limpiar localStorage si falla)
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Función auxiliar para escribir en localStorage de forma segura (iOS compatible)
      const safeSetItem = (key, value) => {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (e) {
          console.warn(`No se pudo escribir en localStorage (${key}):`, e.message);
          return false;
        }
      };
      
      // Guardar token y usuario en localStorage
      safeSetItem('token', token);
      safeSetItem('user', JSON.stringify(user));
      
      // Guardar modulo por separado para fácil acceso
      if (user.modulo) {
        safeSetItem('modulo', user.modulo);
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
    // Limpiar localStorage de forma segura (iOS compatible)
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('No se pudo limpiar localStorage:', e.message);
      // Intentar limpiar elementos individuales como fallback
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('modulo');
      } catch (e2) {
        console.warn('No se pudieron eliminar elementos individuales:', e2.message);
      }
    }
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
