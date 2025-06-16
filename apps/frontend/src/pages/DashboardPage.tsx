import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
} from '@mui/material';
import { 
  People, 
  Assignment, 
  TrendingUp, 
  AttachMoney,
  Public,
  Schedule,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useCustomers, useOrders } from '../hooks/useApi';
import type { Order, Customer } from '../types';

const DashboardPage = () => {
  const { data: customers, isLoading: customersLoading, error: customersError } = useCustomers();
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useOrders();

  // Loading state
  if (customersLoading || ordersLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error state
  if (customersError || ordersError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading dashboard data: {customersError?.message || ordersError?.message}
        </Alert>
      </Box>
    );
  }

  // Default to empty arrays if data is not available
  const customersData: Customer[] = customers || [];
  const ordersData: Order[] = orders || [];

  // Calculate metrics
  const totalRevenue = ordersData.reduce((sum, order) => sum + order.totalPrice, 0);
  const pendingOrders = ordersData.filter(order => order.status === 'PENDING').length;
  const deliveredOrders = ordersData.filter(order => order.status === 'DELIVERED').length;
  const inProductionOrders = ordersData.filter(order => order.status === 'IN_PRODUCTION').length;
  const urgentOrders = ordersData.filter(order => order.priority === 'URGENT').length;

  // Country-wise order distribution
  const countryStats = ordersData.reduce((acc, order) => {
    const country = order.customer?.country || 'Unknown';
    if (!acc[country]) {
      acc[country] = { orders: 0, revenue: 0 };
    }
    acc[country].orders++;
    acc[country].revenue += order.totalPrice;
    return acc;
  }, {} as Record<string, { orders: number; revenue: number }>);

  const topCountries = Object.entries(countryStats)
    .sort(([,a], [,b]) => b.revenue - a.revenue)
    .slice(0, 10);

  // Status distribution
  const statusStats = ordersData.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Recent orders
  const recentOrders = ordersData
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 5);

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = 'primary',
    subtitle 
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    subtitle?: string;
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="h2" color={`${color}.main`}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box color={`${color}.main`} sx={{ fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'PENDING': return 'warning';
      case 'CANCELLED': return 'error';
      case 'IN_PRODUCTION': return 'primary';
      case 'QUALITY_CHECK': return 'secondary';
      case 'READY_FOR_DELIVERY': return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'primary';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getLinearProgressColor = (status: string): 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const color = getStatusColor(status);
    return color === 'default' ? 'primary' : color;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Glass Order Management Dashboard
      </Typography>
      
      {/* Key Metrics */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Key Metrics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Customers"
              value={customersData.length}
              icon={<People />}
              color="primary"
              subtitle="Active accounts"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Orders"
              value={ordersData.length}
              icon={<Assignment />}
              color="secondary"
              subtitle="All time orders"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Revenue"
              value={`$${totalRevenue.toLocaleString()}`}
              icon={<AttachMoney />}
              color="success"
              subtitle="USD"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Countries"
              value={Object.keys(countryStats).length}
              icon={<Public />}
              color="info"
              subtitle="Global reach"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Operational Metrics */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Operations Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="In Production"
              value={inProductionOrders}
              icon={<TrendingUp />}
              color="primary"
              subtitle="Active manufacturing"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Orders"
              value={pendingOrders}
              icon={<Schedule />}
              color="warning"
              subtitle="Awaiting confirmation"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Delivered"
              value={deliveredOrders}
              icon={<CheckCircle />}
              color="success"
              subtitle="Completed orders"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Urgent Orders"
              value={urgentOrders}
              icon={<Warning />}
              color="error"
              subtitle="High priority"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Charts and Tables */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Top Countries by Revenue */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Top Countries by Revenue
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
                  {topCountries.map(([country, stats]) => (
                    <TableRow key={country}>
                      <TableCell>{country}</TableCell>
                      <TableCell align="right">{stats.orders}</TableCell>
                      <TableCell align="right">${stats.revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Order Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Order Status Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              {Object.entries(statusStats).map(([status, count]) => {
                const percentage = (count / ordersData.length) * 100;
                return (
                  <Box key={status} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Chip 
                        label={status.replace(/_/g, ' ')} 
                        color={getStatusColor(status)}
                        size="small"
                      />
                      <Typography variant="body2" color="textSecondary">
                        {count} ({percentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      color={getLinearProgressColor(status)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Orders */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Recent Orders
        </Typography>
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order Number</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Order Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell sx={{ fontWeight: 'medium' }}>
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.customer?.name || 'Unknown'}</TableCell>
                    <TableCell>{order.customer?.country || 'Unknown'}</TableCell>
                    <TableCell align="right">
                      ${order.totalPrice.toLocaleString()} {order.currency}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={order.status.replace(/_/g, ' ')} 
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={order.priority} 
                        color={getPriorityColor(order.priority)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(order.orderDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
};

export default DashboardPage;