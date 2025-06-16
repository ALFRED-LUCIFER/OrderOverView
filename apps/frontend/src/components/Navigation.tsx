import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  Dashboard,
  People,
  Assignment,
} from '@mui/icons-material';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getTabValue = () => {
    switch (location.pathname) {
      case '/':
        return 0;
      case '/customers':
        return 1;
      case '/orders':
        return 2;
      default:
        return 0;
    }
  };

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/customers');
        break;
      case 2:
        navigate('/orders');
        break;
    }
  };

  return (
    <Paper elevation={1}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={getTabValue()} onChange={handleChange} centered>
          <Tab 
            icon={<Dashboard />} 
            label="Dashboard" 
            iconPosition="start"
          />
          <Tab 
            icon={<People />} 
            label="Customers" 
            iconPosition="start"
          />
          <Tab 
            icon={<Assignment />} 
            label="Orders" 
            iconPosition="start"
          />
        </Tabs>
      </Box>
    </Paper>
  );
};

export default Navigation;
