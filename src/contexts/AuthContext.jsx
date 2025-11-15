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
    // Función auxiliar para manejar localStorage de forma segura en móvil
    const safeLocalStorage = {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.warn(`Error al acceder a localStorage (${key}):`, error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn(`Error al guardar en localStorage (${key}):`, error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Error al eliminar de localStorage (${key}):`, error);
        }
      }
    };

    // Función para verificar y restaurar la sesión
    const checkAuth = async () => {
      // Timeout de seguridad para evitar carga infinita
      const timeoutId = setTimeout(() => {
        console.warn('Timeout en verificación de autenticación, forzando finalización');
        dispatch({ type: 'SET_LOADING', payload: false });
      }, 5000); // 5 segundos máximo

      try {
        // Verificar si hay token guardado
        const token = safeLocalStorage.getItem('token');
        const user = safeLocalStorage.getItem('user');
        
        if (token && user) {
          try {
            const userData = JSON.parse(user);
            
            // Validar que los datos sean válidos
            if (userData && typeof userData === 'object' && !Array.isArray(userData)) {
              // Asegurar que el modulo esté en localStorage
              if (userData.modulo) {
                safeLocalStorage.setItem('modulo', userData.modulo);
              }
              
              // Restaurar el estado de autenticación
              clearTimeout(timeoutId);
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  token,
                  user: userData,
                },
              });
              return;
            } else {
              // Datos inválidos, limpiar
              console.warn('Datos de usuario inválidos, limpiando localStorage');
              safeLocalStorage.removeItem('token');
              safeLocalStorage.removeItem('user');
              safeLocalStorage.removeItem('modulo');
            }
          } catch (parseError) {
            console.error('Error al parsear datos de usuario:', parseError);
            // Si hay error al parsear, limpiar datos corruptos
            safeLocalStorage.removeItem('token');
            safeLocalStorage.removeItem('user');
            safeLocalStorage.removeItem('modulo');
          }
        }
        
        // Si no hay token o hay error, marcar como no autenticado
        clearTimeout(timeoutId);
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        // En caso de cualquier error, limpiar y marcar como no autenticado
        clearTimeout(timeoutId);
        safeLocalStorage.removeItem('token');
        safeLocalStorage.removeItem('user');
        safeLocalStorage.removeItem('modulo');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Guardar token y usuario en localStorage de forma segura
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Guardar modulo por separado para fácil acceso
        if (user.modulo) {
          localStorage.setItem('modulo', user.modulo);
        }
      } catch (storageError) {
        console.error('Error al guardar en localStorage:', storageError);
        // Continuar aunque falle el localStorage (modo privado, etc.)
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
    try {
      localStorage.clear(); // Limpiar todo el localStorage
    } catch (error) {
      console.warn('Error al limpiar localStorage:', error);
      // Intentar limpiar elementos individuales
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('modulo');
      } catch (e) {
        console.warn('Error al limpiar elementos individuales:', e);
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
