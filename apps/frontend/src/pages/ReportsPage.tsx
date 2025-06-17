import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Assessment,
  Download,
  TrendingUp,
  TrendingDown,
  People,
  AttachMoney,
  Assignment,
  Public,
  BarChart,
  PieChart,
  Visibility,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReportsAnalyticsDialog from '../components/ReportsAnalyticsDialog';
import { 
  reportsService,
  AnalyticsOverview,
  QuarterOption,
} from '../services/reportsService';
import { useCustomers } from '../hooks/useApi';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [availableQuarters, setAvailableQuarters] = useState<QuarterOption[]>([]);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'quarterly' | 'customer'>('quarterly');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');

  useEffect(() => {
    loadAnalyticsOverview();
    loadAvailableQuarters();
  }, []);

  const loadAnalyticsOverview = async () => {
    try {
      setLoading(true);
      const overview = await reportsService.getAnalyticsOverview();
      setAnalyticsOverview(overview);
    } catch (err) {
      setError('Failed to load analytics overview');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableQuarters = async () => {
    try {
      const quarters = await reportsService.getAvailableQuarters();
      setAvailableQuarters(quarters);
    } catch (err) {
      console.error('Failed to load quarters:', err);
    }
  };

  const handleQuarterlyReport = () => {
    setDialogType('quarterly');
    setDialogOpen(true);
  };

  const handleCustomerReport = (customerId?: string, customerName?: string) => {
    if (customerId && customerName) {
      setSelectedCustomerId(customerId);
      setSelectedCustomerName(customerName);
      setDialogType('customer');
      setDialogOpen(true);
    } else {
      // Show customer selector
      setDialogType('customer');
      setDialogOpen(true);
    }
  };

  const handleDownloadQuarterlyPdf = async () => {
    if (availableQuarters.length > 0) {
      const latest = availableQuarters[0];
      await reportsService.downloadQuarterlyReportPdf(latest.year, latest.quarter);
    }
  };

  const formatGrowthPercentage = (value: number) => {
    const isPositive = value >= 0;
    const icon = isPositive ? <TrendingUp /> : <TrendingDown />;
    const color = isPositive ? 'success.main' : 'error.main';
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color }}>
        {icon}
        <Typography variant="body2" sx={{ ml: 0.5 }}>
          {Math.abs(value).toFixed(1)}%
        </Typography>
      </Box>
    );
  };

  if (loading && !analyticsOverview) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          📊 Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive analytics and reporting for your glass order management system
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <BarChart sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Quarterly Reports
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Comprehensive quarterly business analytics with charts and insights
              </Typography>
              <Button 
                variant="contained" 
                fullWidth 
                onClick={handleQuarterlyReport}
                startIcon={<Visibility />}
              >
                View Report
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Customer Analytics
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Detailed customer analysis with order history and preferences
              </Typography>
              <Button 
                variant="contained" 
                color="info"
                fullWidth 
                onClick={() => handleCustomerReport()}
                startIcon={<Visibility />}
              >
                View Report
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Overview Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Quick overview of key metrics and performance indicators
              </Typography>
              <Button 
                variant="contained" 
                color="success"
                fullWidth 
                onClick={() => navigate('/dashboard')}
                startIcon={<Assessment />}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Current Quarter Overview */}
      {analyticsOverview && (
        <>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Current Quarter Overview ({analyticsOverview.current.quarter} {analyticsOverview.current.year})
          </Typography>

          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {analyticsOverview.current.totalOrders}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Orders
                  </Typography>
                  {analyticsOverview.previous && (
                    formatGrowthPercentage(analyticsOverview.trends.ordersGrowth)
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    ${analyticsOverview.current.totalRevenue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  {analyticsOverview.previous && (
                    formatGrowthPercentage(analyticsOverview.trends.revenueGrowth)
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {analyticsOverview.current.topCountries.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Countries Served
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {analyticsOverview.current.topCustomers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Customers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Top Performers */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Top Countries */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <Public sx={{ mr: 1 }} />
                    Top Countries This Quarter
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Country</TableCell>
                          <TableCell align="right">Orders</TableCell>
                          <TableCell align="right">Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analyticsOverview.current.topCountries.map((country, index) => (
                          <TableRow key={country.country}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={index + 1} 
                                  size="small" 
                                  color={index < 3 ? 'primary' : 'default'}
                                  sx={{ mr: 1, minWidth: 30 }}
                                />
                                {country.country}
                              </Box>
                            </TableCell>
                            <TableCell align="right">{country.orderCount}</TableCell>
                            <TableCell align="right">${country.totalRevenue.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Customers */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <People sx={{ mr: 1 }} />
                    Top Customers This Quarter
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Customer</TableCell>
                          <TableCell align="right">Orders</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analyticsOverview.current.topCustomers.map((customer, index) => (
                          <TableRow key={customer.customerId}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={index + 1} 
                                  size="small" 
                                  color={index < 3 ? 'primary' : 'default'}
                                  sx={{ mr: 1, minWidth: 30 }}
                                />
                                {customer.customerName}
                              </Box>
                            </TableCell>
                            <TableCell align="right">{customer.orderCount}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Customer Report">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleCustomerReport(customer.customerId, customer.customerName)}
                                >
                                  <Assessment />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quick Download Section */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Downloads
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Button 
                    variant="outlined" 
                    startIcon={<Download />}
                    onClick={handleDownloadQuarterlyPdf}
                    disabled={availableQuarters.length === 0}
                  >
                    Current Quarter PDF
                  </Button>
                </Grid>
                <Grid item>
                  <Button 
                    variant="outlined" 
                    startIcon={<PieChart />}
                    onClick={handleQuarterlyReport}
                  >
                    Detailed Analytics
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}

      {/* Reports Analytics Dialog */}
      <ReportsAnalyticsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        reportType={dialogType}
        customerId={selectedCustomerId}
        customerName={selectedCustomerName}
      />
    </Box>
  );
};

export default ReportsPage;
