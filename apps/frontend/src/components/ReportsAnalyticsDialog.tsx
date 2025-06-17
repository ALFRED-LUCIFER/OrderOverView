import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Assessment,
  PieChart,
  BarChart,
  Close,
} from '@mui/icons-material';
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { 
  reportsService, 
  QuarterlyReportData, 
  CustomerReportData, 
  QuarterOption 
} from '../services/reportsService';

interface ReportsAnalyticsDialogProps {
  open: boolean;
  onClose: () => void;
  reportType: 'quarterly' | 'customer';
  customerId?: string;
  customerName?: string;
}

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7', '#689f38', '#f4511e'];

const ReportsAnalyticsDialog: React.FC<ReportsAnalyticsDialogProps> = ({
  open,
  onClose,
  reportType,
  customerId,
  customerName,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyReportData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerReportData | null>(null);
  const [availableQuarters, setAvailableQuarters] = useState<QuarterOption[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  useEffect(() => {
    if (open) {
      if (reportType === 'quarterly') {
        loadAvailableQuarters();
      } else if (reportType === 'customer' && customerId) {
        loadCustomerReport(customerId);
      }
    }
  }, [open, reportType, customerId]);

  useEffect(() => {
    if (selectedQuarter && reportType === 'quarterly') {
      const [year, quarter] = selectedQuarter.split('-').map(Number);
      loadQuarterlyReport(year, quarter);
    }
  }, [selectedQuarter]);

  const loadAvailableQuarters = async () => {
    try {
      setLoading(true);
      const quarters = await reportsService.getAvailableQuarters();
      setAvailableQuarters(quarters);
      
      // Auto-select the most recent quarter
      if (quarters.length > 0) {
        setSelectedQuarter(quarters[0].value);
      }
    } catch (err) {
      setError('Failed to load available quarters');
    } finally {
      setLoading(false);
    }
  };

  const loadQuarterlyReport = async (year: number, quarter: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getQuarterlyReport(year, quarter);
      setQuarterlyData(data);
    } catch (err) {
      setError('Failed to load quarterly report');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerReport = async (customerId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getCustomerReport(customerId);
      setCustomerData(data);
    } catch (err) {
      setError('Failed to load customer report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      if (reportType === 'quarterly' && selectedQuarter) {
        const [year, quarter] = selectedQuarter.split('-').map(Number);
        await reportsService.downloadQuarterlyReportPdf(year, quarter);
      } else if (reportType === 'customer' && customerId) {
        await reportsService.downloadCustomerReportPdf(customerId);
      }
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const renderQuarterlyAnalytics = () => {
    if (!quarterlyData) return null;

    // Prepare data for charts
    const statusData = Object.entries(quarterlyData.ordersByStatus).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
      percentage: ((count / quarterlyData.totalOrders) * 100).toFixed(1),
    }));

    const countryData = quarterlyData.topCountries.slice(0, 8).map(country => ({
      name: country.country,
      orders: country.orderCount,
      revenue: country.totalRevenue,
    }));

    const monthlyData = quarterlyData.monthlyTrend.map(month => ({
      name: month.month,
      orders: month.orders,
      revenue: month.revenue,
    }));

    return (
      <>
        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {quarterlyData.totalOrders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  ${quarterlyData.totalRevenue.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main" fontWeight="bold">
                  ${Math.round(quarterlyData.totalRevenue / quarterlyData.totalOrders).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Order Value
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {quarterlyData.topCountries.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Countries Served
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Order Status Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PieChart sx={{ mr: 1 }} />
                  Order Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Countries */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <BarChart sx={{ mr: 1 }} />
                  Top Countries by Revenue
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={countryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#1976d2" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Trend */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUp sx={{ mr: 1 }} />
                  Monthly Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="orders" orientation="left" />
                    <YAxis yAxisId="revenue" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="orders" dataKey="orders" fill="#388e3c" name="Orders" />
                    <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#f57c00" name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Top Customers Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Customers by Revenue
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Avg Order</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quarterlyData.topCustomers.slice(0, 10).map((customer, index) => (
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
                      <TableCell align="right">${customer.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        ${Math.round(customer.totalRevenue / customer.orderCount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderCustomerAnalytics = () => {
    if (!customerData) return null;

    // Prepare data for charts
    const statusData = Object.entries(customerData.ordersByStatus).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
      percentage: ((count / customerData.totalOrders) * 100).toFixed(1),
    }));

    const glassTypeData = Object.entries(customerData.glassTypePreferences).map(([type, count]) => ({
      name: type,
      value: count,
      percentage: ((count / customerData.totalOrders) * 100).toFixed(1),
    }));

    const monthlyTrendData = customerData.monthlyOrderTrend.map(month => ({
      name: month.month,
      orders: month.orders,
      revenue: month.revenue,
    }));

    return (
      <>
        {/* Customer Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {customerData.customerName}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Email:</strong> {customerData.customerEmail}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Location:</strong> {customerData.city}, {customerData.country}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Customer Since:</strong> {new Date(customerData.firstOrderDate).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Last Order:</strong> {new Date(customerData.lastOrderDate).toLocaleDateString()}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {customerData.totalOrders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  ${customerData.totalRevenue.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main" fontWeight="bold">
                  ${Math.round(customerData.averageOrderValue).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Order Value
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {Object.keys(customerData.glassTypePreferences).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Glass Types Ordered
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Order Status Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Glass Type Preferences */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Glass Type Preferences
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={glassTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {glassTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Trend */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  12-Month Order Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="orders" orientation="left" />
                    <YAxis yAxisId="revenue" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="orders" dataKey="orders" fill="#388e3c" name="Orders" />
                    <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#f57c00" name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Orders Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Orders
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order Number</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Glass Type</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customerData.orders.slice(0, 10).map((order) => (
                    <TableRow key={order.orderNumber}>
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status.replace(/_/g, ' ')} 
                          size="small"
                          color={order.status === 'DELIVERED' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{order.glassType}</TableCell>
                      <TableCell align="right">{order.quantity}</TableCell>
                      <TableCell align="right">${order.totalPrice.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Assessment sx={{ mr: 1 }} />
            {reportType === 'quarterly' ? 'Quarterly Analytics Report' : `Customer Analytics - ${customerName}`}
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        
        {reportType === 'quarterly' && (
          <Box sx={{ mt: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Quarter</InputLabel>
              <Select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                label="Select Quarter"
              >
                {availableQuarters.map((quarter) => (
                  <MenuItem key={quarter.value} value={quarter.value}>
                    {quarter.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            {reportType === 'quarterly' && renderQuarterlyAnalytics()}
            {reportType === 'customer' && renderCustomerAnalytics()}
          </>
        )}
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button 
          variant="contained" 
          startIcon={<Download />}
          onClick={handleDownloadPdf}
          disabled={loading || !!error}
        >
          Download PDF Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportsAnalyticsDialog;
