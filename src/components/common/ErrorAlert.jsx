import { Alert, AlertTitle, Collapse, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useState } from 'react';

const ErrorAlert = ({ 
  error, 
  title = 'Error', 
  onClose, 
  severity = 'error',
  showCloseButton = true 
}) => {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  if (!error) return null;

  return (
    <Collapse in={open}>
      <Alert
        severity={severity}
        action={
          showCloseButton && (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleClose}
            >
              <Close fontSize="inherit" />
            </IconButton>
          )
        }
        sx={{ mb: 2 }}
      >
        <AlertTitle>{title}</AlertTitle>
        {error}
      </Alert>
    </Collapse>
  );
};

export default ErrorAlert;
