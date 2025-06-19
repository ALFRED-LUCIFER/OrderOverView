import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  MonetizationOn as MoneyIcon,
  BusinessCenter as BusinessIcon,
  Assessment as AnalyticsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTopProfitOrders, useProfitAnalytics } from '../hooks/useApi';
import { useNotification } from '../contexts/NotificationContext';

const TopProfitOrdersPage = () => {
  const { showError } = useNotification();
  const [limit, setLimit] = useState(10);
  
  // Fetch data
  const { 
    data: topOrders = [], 
    isLoading: ordersLoading, 
    error: ordersError,
    refetch: refetchOrders
  } = useTopProfitOrders(limit);
  
  const { 
    data: analytics, 
    isLoading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics
  } = useProfitAnalytics();

  const handleRefresh = () => {
    refetchOrders();
    refetchAnalytics();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'IN_PRODUCTION': return 'primary';
      case 'QUALITY_CHECK': return 'secondary';
      case 'READY_FOR_DELIVERY': return 'success';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'error';
      case 'ON_HOLD': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'info';
      case 'HIGH': return 'warning';
      case 'URGENT': return 'error';
      default: return 'default';
    }
  };

  // Loading state
  if (ordersLoading || analyticsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error state
  if (ordersError || analyticsError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">
          Error loading profit data: {ordersError?.message || analyticsError?.message}. 
          Please check if the backend is running.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            📈 Top Maximum Profit Orders
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Show Top</InputLabel>
              <Select
                value={limit}
                label="Show Top"
                onChange={(e) => setLimit(e.target.value as number)}
              >
                <MenuItem value={5}>Top 5</MenuItem>
                <MenuItem value={10}>Top 10</MenuItem>
                <MenuItem value={15}>Top 15</MenuItem>
                <MenuItem value={20}>Top 20</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Analytics Overview Cards */}
        {analytics && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MoneyIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      ${analytics.totalRevenue?.toLocaleString() || '0'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BusinessIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="secondary">
                      {analytics.totalOrders || 0}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AnalyticsIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="success.main">
                      ${analytics.averageOrderValue?.toLocaleString() || '0'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Order Value
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="warning.main">
                      ${topOrders[0]?.totalPrice?.toLocaleString() || '0'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Highest Order Value
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Divider sx={{ mb: 3 }} />

        {/* Top Profit Orders Table */}
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          🏆 Top {limit} Maximum Profit Orders
        </Typography>
        
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><strong>Rank</strong></TableCell>
                <TableCell><strong>Order Number</strong></TableCell>
                <TableCell><strong>Customer</strong></TableCell>
                <TableCell><strong>Glass Type</strong></TableCell>
                <TableCell><strong>Quantity</strong></TableCell>
                <TableCell><strong>Dimensions</strong></TableCell>
                <TableCell><strong>Unit Price</strong></TableCell>
                <TableCell><strong>Total Profit</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Priority</strong></TableCell>
                <TableCell><strong>Created Date</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topOrders.map((order: any, index: number) => (
                <TableRow 
                  key={order.id} 
                  hover
                  sx={{ 
                    backgroundColor: index < 3 ? 'rgba(255, 215, 0, 0.1)' : 'inherit',
                    '&:hover': { backgroundColor: 'rgba(255, 215, 0, 0.2)' }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {index + 1}
                      {index === 0 && <span style={{ marginLeft: 8 }}>🥇</span>}
                      {index === 1 && <span style={{ marginLeft: 8 }}>🥈</span>}
                      {index === 2 && <span style={{ marginLeft: 8 }}>🥉</span>}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <strong>{order.orderNumber}</strong>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {order.customer?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {order.customer?.country || 'N/A'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.glassType?.replace('_', ' ') || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.glassClass?.replace('_', ' ') || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {order.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.width} × {order.height} × {order.thickness}mm
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      ${order.unitPrice?.toLocaleString() || '0'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="h6" 
                      color="primary" 
                      fontWeight="bold"
                      sx={{ 
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        padding: '4px 8px',
                        borderRadius: 1,
                        textAlign: 'center'
                      }}
                    >
                      ${order.totalPrice?.toLocaleString() || '0'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.status?.replace('_', ' ') || 'PENDING'}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.priority || 'MEDIUM'}
                      color={getPriorityColor(order.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {topOrders.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" sx={{ mt: 2 }}>
              No orders found. Create some orders to see profit analytics.
            </Typography>
          </Box>
        )}

        {/* Top Customers Section */}
        {analytics?.topCustomers && analytics.topCustomers.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
              💼 Top Customers by Revenue
            </Typography>
            <Grid container spacing={2}>
              {analytics.topCustomers.slice(0, 5).map((customer: any, index: number) => (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={customer.customerId}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" color="text.secondary">
                          #{index + 1}
                        </Typography>
                        {index === 0 && <span style={{ marginLeft: 8 }}>👑</span>}
                      </Box>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {customer.customerName}
                      </Typography>
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        ${customer.totalRevenue?.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {customer.orderCount} orders
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Summary */}
        <Box sx={{ mt: 4, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            💡 This analysis shows orders ranked by total profit (total price). 
            Last updated: {analytics?.lastUpdated ? new Date(analytics.lastUpdated).toLocaleString() : 'N/A'}
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default TopProfitOrdersPage;
