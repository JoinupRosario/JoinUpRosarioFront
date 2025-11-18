import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#c41e3a', marginBottom: '20px', fontSize: '24px' }}>
              ⚠️ Error en la aplicación
            </h1>
            <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>
            {this.state.error && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#fff5f5',
                border: '1px solid #feb2b2',
                borderRadius: '4px',
                textAlign: 'left',
                fontSize: '12px',
                maxHeight: '300px',
                overflow: 'auto',
                width: '100%'
              }}>
                <p style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '10px', 
                  color: '#c41e3a',
                  fontSize: '14px'
                }}>
                  ⚠️ Detalles del error:
                </p>
                <div style={{
                  backgroundColor: '#fff',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '10px'
                }}>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    margin: 0,
                    color: '#2d3748'
                  }}>
                    {this.state.error.toString()}
                  </pre>
                </div>
                {this.state.errorInfo?.componentStack && (
                  <details style={{ marginTop: '10px' }}>
                    <summary style={{ 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      color: '#718096',
                      fontSize: '11px'
                    }}>
                      Ver stack trace completo
                    </summary>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      fontSize: '10px',
                      lineHeight: '1.3',
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#f7fafc',
                      borderRadius: '4px',
                      color: '#4a5568'
                    }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <button
              onClick={this.handleReload}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                backgroundColor: '#c41e3a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#a01730'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#c41e3a'}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

