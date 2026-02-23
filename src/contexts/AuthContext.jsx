import { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  permissions: [],  // array de { codigo, nombre, modulo }
  roles: [],        // array de { _id, nombre }
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
        permissions: action.payload.permissions ?? state.permissions,
        roles: action.payload.roles ?? state.roles,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        permissions: [],
        roles: [],
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

/** Carga los permisos del usuario administrativo desde el backend y los persiste en localStorage. */
const fetchAndStorePermissions = async (token) => {
  try {
    const { data } = await api.get('/users/my-permissions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const permissions = data.permissions ?? [];
    const roles = data.roles ?? [];
    localStorage.setItem('permissions', JSON.stringify(permissions));
    localStorage.setItem('roles', JSON.stringify(roles));
    return { permissions, roles };
  } catch {
    return { permissions: [], roles: [] };
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

              // Restaurar permisos desde localStorage
              let permissions = [];
              let roles = [];
              try {
                permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
                roles = JSON.parse(localStorage.getItem('roles') || '[]');
              } catch { /* ignorar */ }
              
              // Restaurar el estado de autenticación
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { token, user: userData, permissions, roles },
              });
              return;
            }
          } catch (parseError) {
            console.error('Error al parsear datos de usuario:', parseError);
            // Si hay error al parsear, limpiar datos corruptos
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('modulo');
          localStorage.removeItem('permissions');
          localStorage.removeItem('roles');
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
        localStorage.removeItem('permissions');
        localStorage.removeItem('roles');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (user.modulo) {
        localStorage.setItem('modulo', user.modulo);
      }

      // Cargar permisos para usuarios administrativos
      let permissions = [];
      let roles = [];
      if (user.modulo === 'administrativo') {
        ({ permissions, roles } = await fetchAndStorePermissions(token));
      }
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { token, user, permissions, roles },
      });
      
      return { success: true, modulo: user.modulo };
    } catch (error) {
      return {
        success: false,
        code: error.response?.data?.code || null,
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

  // Usado por el flujo SAML: recibe token + usuario ya validados por el backend
  const loginWithToken = async (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (user.modulo) {
      localStorage.setItem('modulo', user.modulo);
    }

    let permissions = [];
    let roles = [];
    if (user.modulo === 'administrativo') {
      ({ permissions, roles } = await fetchAndStorePermissions(token));
    }

    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { token, user, permissions, roles },
    });
  };

  const logout = () => {
    localStorage.clear();
    dispatch({ type: 'LOGOUT' });
  };

  /** Helper para verificar si el usuario tiene un permiso por su código. */
  const hasPermission = (codigo) => state.permissions.some((p) => p.codigo === codigo);

  /** Helper para verificar si el usuario tiene alguno de los permisos dados. */
  const hasAnyPermission = (...codigos) => codigos.some((c) => hasPermission(c));

  const value = {
    ...state,
    login,
    loginWithToken,
    register,
    logout,
    hasPermission,
    hasAnyPermission,
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
